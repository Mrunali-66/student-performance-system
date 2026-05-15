# routes/teacher_routes.py — Teacher-only RBAC routes (flask-jwt-extended)
import io
import csv
from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import get_jwt_identity, get_jwt
from database import db
from models.user import User
from models.student_performance import StudentPerformance
from middleware.rbac import teacher_required
from ml.predictor import predict_single, predict_bulk

teacher_bp = Blueprint("teacher", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _perf_to_dict(perf: StudentPerformance, user: User, analysis: dict = None) -> dict:
    """Build a full response dict with all field aliases."""
    return perf.to_dict(user=user, analysis=analysis)


def _run_ml(perf: StudentPerformance) -> dict:
    """Run ML prediction on a performance record and return analysis dict."""
    return predict_single(
        attendance=perf.attendance,
        study_hours=perf.study_hours,
        test_score=perf.test_score,
        assignment_score=perf.assignment_score,
    )


def _update_perf_from_ml(perf: StudentPerformance, analysis: dict) -> StudentPerformance:
    """Write ML results back onto the performance record."""
    perf.prediction_result = analysis["prediction_result"]
    perf.risk_percentage   = analysis["risk_percentage"]
    return perf


def _get_all_students() -> list[dict]:
    """Return all student users joined with their performance records."""
    students = (
        db.session.query(User, StudentPerformance)
        .outerjoin(StudentPerformance, User.id == StudentPerformance.student_id)
        .filter(User.role == "student")
        .order_by(User.username)
        .all()
    )
    result = []
    for user, perf in students:
        if perf is None:
            # Student has no performance record yet — return defaults
            row = {
                "id": user.id, "username": user.username, "name": user.username,
                "branch": user.branch, "batch": user.branch, "role": user.role,
                "attendance": 0, "study_hours": 0,
                "test_score": 0, "prev_score": 0, "internal_marks": 0,
                "assignment_score": 0, "assignments_completed": 0,
                "prediction_result": "Unanalyzed",
                "category": "Unanalyzed", "risk_level": "Unanalyzed",
                "risk_percentage": 0, "performance_score": 0,
                "predicted_performance": 0,
            }
        else:
            analysis = _run_ml(perf)
            row = perf.to_dict(user=user, analysis=analysis)
            # perf.to_dict() sets "id" = perf.id (the performance row id).
            # The frontend passes s.id to /teacher/student-report/<sid>, which
            # does User.query.filter_by(id=sid) — so it needs the USER id, not
            # the performance row id. Override it here.
            row["id"] = user.id
        result.append(row)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/students
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/students", methods=["GET"])
@teacher_required
def get_all_students():
    try:
        students = _get_all_students()
        return jsonify(students), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /teacher/add-student
# Frontend: AddStudent.jsx → POST /teacher/add-student
# Body fields: username (name), branch (batch), attendance, study_hours,
#              test_score (prev_score), assignment_score (assignments_completed)
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/add-student", methods=["POST"])
@teacher_required
def add_student():
    data = request.get_json(silent=True) or {}

    # Accept both old and new field names
    username         = (data.get("username") or data.get("name") or "").strip()
    password         = data.get("password", "student123")
    branch           = (data.get("branch") or data.get("batch") or "").strip()
    attendance       = float(data.get("attendance", 0))
    study_hours      = float(data.get("study_hours", 0))
    # test_score / prev_score / internal_marks all resolve to test_score
    test_score = float(
        data.get("test_score") or data.get("prev_score") or data.get("internal_marks") or 0
    )
    assignment_score = float(
        data.get("assignment_score") or data.get("assignments_completed") or data.get("assignment_submitted") or 0
    )

    if not username:
        return jsonify({"error": "Username / name is required."}), 400
    if not branch:
        return jsonify({"error": "Branch / batch is required."}), 400

    from config import ActiveConfig
    if branch not in ActiveConfig.ALLOWED_BRANCHES:
        return jsonify({"error": f"Invalid branch: {branch}"}), 400

    # Check duplicate username
    if User.query.filter_by(username=username).first():
        return jsonify({"error": f"Username '{username}' is already taken."}), 409

    import bcrypt
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        user = User(username=username, password=hashed, role="student", branch=branch)
        db.session.add(user)
        db.session.flush()  # get user.id

        analysis = predict_single(attendance, study_hours, test_score, assignment_score)

        perf = StudentPerformance(
            student_id        = user.id,
            username          = user.username,
            attendance        = attendance,
            study_hours       = study_hours,
            test_score        = test_score,
            assignment_score  = assignment_score,
            prediction_result = analysis["prediction_result"],
            risk_percentage   = analysis["risk_percentage"],
        )
        db.session.add(perf)
        db.session.commit()

        return jsonify({
            "message": "Student added successfully.",
            "student": perf.to_dict(user=user, analysis=analysis),
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/student/<id>
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/student/<int:sid>", methods=["GET"])
@teacher_required
def get_student(sid):
    user = User.query.filter_by(id=sid, role="student").first()
    if not user:
        return jsonify({"error": "Student not found."}), 404
    perf = StudentPerformance.query.filter_by(student_id=sid).first()
    if not perf:
        return jsonify({"error": "No performance record found."}), 404
    analysis = _run_ml(perf)
    return jsonify(perf.to_dict(user=user, analysis=analysis)), 200


# ─────────────────────────────────────────────────────────────────────────────
# PUT /teacher/student/<id>
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/student/<int:sid>", methods=["PUT"])
@teacher_required
def update_student(sid):
    data = request.get_json(silent=True) or {}

    user = User.query.filter_by(id=sid, role="student").first()
    if not user:
        return jsonify({"error": "Student not found."}), 404

    perf = StudentPerformance.query.filter_by(student_id=sid).first()
    if not perf:
        perf = StudentPerformance(student_id=sid, username=user.username)
        db.session.add(perf)

    # Accept both old and new field names
    if "attendance" in data:
        perf.attendance = float(data["attendance"])
    if "study_hours" in data:
        perf.study_hours = float(data["study_hours"])
    # test_score / prev_score / internal_marks all write to test_score column
    for key in ("test_score", "prev_score", "internal_marks"):
        if key in data and data[key] is not None:
            perf.test_score = float(data[key])
            break
    # assignment_score / assignments_completed / assignment_submitted write to assignment_score column
    for key in ("assignment_score", "assignments_completed", "assignment_submitted"):
        if key in data and data[key] is not None:
            perf.assignment_score = float(data[key])
            break
    # Safety: no None to ML
    perf.attendance       = perf.attendance       or 0.0
    perf.study_hours      = perf.study_hours      or 0.0
    perf.test_score       = perf.test_score       or 0.0
    perf.assignment_score = perf.assignment_score or 0.0

    try:
        analysis = _run_ml(perf)
        _update_perf_from_ml(perf, analysis)
        db.session.commit()
        return jsonify({
            "message": "Student updated.",
            "record": perf.to_dict(user=user, analysis=analysis),
            "analysis": analysis,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /teacher/student/<id>
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/student/<int:sid>", methods=["DELETE"])
@teacher_required
def delete_student(sid):
    user = User.query.filter_by(id=sid, role="student").first()
    if not user:
        return jsonify({"error": "Student not found."}), 404
    try:
        db.session.delete(user)  # cascade deletes performance record
        db.session.commit()
        return jsonify({"message": f"Student {sid} deleted successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/student-report/<id>
# Called by: AnalysisModal.jsx, TeacherDashboard.jsx
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/student-report/<int:sid>", methods=["GET"])
@teacher_required
def student_report(sid):
    user = User.query.filter_by(id=sid, role="student").first()
    if not user:
        return jsonify({"error": "Student not found."}), 404

    perf = StudentPerformance.query.filter_by(student_id=sid).first()
    if not perf:
        return jsonify({"error": "No performance record found."}), 404

    analysis = _run_ml(perf)
    response = perf.to_dict(user=user, analysis=analysis)
    # Embed full analysis nested too (TeacherDashboard expects report.analysis)
    response["analysis"] = analysis
    return jsonify(response), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/student/<id>/analysis
# Called by: analyticsService.getStudentAnalysis(id)
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/student/<int:sid>/analysis", methods=["GET"])
@teacher_required
def student_analysis(sid):
    user = User.query.filter_by(id=sid, role="student").first()
    if not user:
        return jsonify({"error": "Student not found."}), 404
    perf = StudentPerformance.query.filter_by(student_id=sid).first()
    if not perf:
        return jsonify({"error": "No performance record found."}), 404
    analysis = _run_ml(perf)
    return jsonify({**perf.to_dict(user=user, analysis=analysis), "analysis": analysis}), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/student/<id>/suggestions
# Called by: analyticsService.getImprovementSuggestions(id)
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/student/<int:sid>/suggestions", methods=["GET"])
@teacher_required
def student_suggestions(sid):
    user = User.query.filter_by(id=sid, role="student").first()
    if not user:
        return jsonify({"error": "Student not found."}), 404
    perf = StudentPerformance.query.filter_by(student_id=sid).first()
    if not perf:
        return jsonify({"error": "No performance record found."}), 404
    analysis = _run_ml(perf)
    return jsonify({
        "student_id": sid,
        "username":   user.username,
        "name":       user.username,
        "suggestions": analysis.get("suggestions", []),
        "weaknesses":  analysis.get("weaknesses", []),
        "strengths":   analysis.get("strengths", []),
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/weak-students
# Called by: analyticsService.getWeakStudents(), teacherService.getWeakStudents()
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/weak-students", methods=["GET"])
@teacher_required
def weak_students():
    try:
        all_students = _get_all_students()
        weak = [
            s for s in all_students
            if s.get("prediction_result") in ("Weak",)
            or float(s.get("performance_score", 0)) < 40
        ]
        weak.sort(key=lambda s: float(s.get("performance_score", 0)))
        return jsonify(weak), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/analytics
# Called by: analyticsService.getAnalytics(), teacherService.getAnalytics()
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/analytics", methods=["GET"])
@teacher_required
def analytics():
    try:
        students = _get_all_students()
        total = len(students)
        if total == 0:
            return jsonify({
                "total": 0, "weak": 0, "average": 0, "top": 0,
                "avg_score": 0, "students": [],
            }), 200

        weak    = sum(1 for s in students if float(s.get("performance_score", 0)) < 40)
        average = sum(1 for s in students if 40 <= float(s.get("performance_score", 0)) <= 75)
        top     = sum(1 for s in students if float(s.get("performance_score", 0)) > 75)
        avg_score = round(
            sum(float(s.get("performance_score", 0)) for s in students) / total, 1
        )

        return jsonify({
            "total": total,
            "weak": weak,
            "average": average,
            "top": top,
            "avg_score": avg_score,
            "students": students,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/analytics/attendance
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/analytics/attendance", methods=["GET"])
@teacher_required
def analytics_attendance():
    try:
        students = _get_all_students()
        buckets = {
            "below_60":  sum(1 for s in students if float(s.get("attendance", 0)) < 60),
            "60_to_75":  sum(1 for s in students if 60 <= float(s.get("attendance", 0)) < 75),
            "75_to_90":  sum(1 for s in students if 75 <= float(s.get("attendance", 0)) < 90),
            "above_90":  sum(1 for s in students if float(s.get("attendance", 0)) >= 90),
            "avg":       round(
                sum(float(s.get("attendance", 0)) for s in students) / max(len(students), 1), 1
            ),
        }
        return jsonify(buckets), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/analytics/marks
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/analytics/marks", methods=["GET"])
@teacher_required
def analytics_marks():
    try:
        students = _get_all_students()
        total = len(students)
        avg_test       = round(sum(float(s.get("test_score", 0)) for s in students) / max(total, 1), 1)
        avg_assignment = round(sum(float(s.get("assignment_score", 0)) for s in students) / max(total, 1), 1)
        avg_score      = round(sum(float(s.get("performance_score", 0)) for s in students) / max(total, 1), 1)
        return jsonify({
            "avg_test_score": avg_test,
            "avg_assignment_score": avg_assignment,
            "avg_performance_score": avg_score,
            "total": total,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/analytics/branch-performance
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/analytics/branch-performance", methods=["GET"])
@teacher_required
def analytics_branch_performance():
    try:
        students = _get_all_students()
        branch_map: dict = {}
        for s in students:
            branch = s.get("branch") or s.get("batch") or "Unknown"
            if branch not in branch_map:
                branch_map[branch] = []
            branch_map[branch].append(float(s.get("performance_score", 0)))

        result = []
        for branch, scores in branch_map.items():
            result.append({
                "branch": branch,
                "batch":  branch,
                "count":  len(scores),
                "avg_score": round(sum(scores) / len(scores), 1),
                "weak":  sum(1 for sc in scores if sc < 40),
                "top":   sum(1 for sc in scores if sc > 75),
            })
        result.sort(key=lambda x: x["avg_score"], reverse=True)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/analytics/batch?batch=X
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/analytics/batch", methods=["GET"])
@teacher_required
def analytics_batch():
    batch = request.args.get("batch", "")
    try:
        students = _get_all_students()
        if batch:
            students = [s for s in students if (s.get("branch") or s.get("batch")) == batch]
        total = len(students)
        avg_score = round(
            sum(float(s.get("performance_score", 0)) for s in students) / max(total, 1), 1
        )
        return jsonify({
            "batch": batch,
            "total": total,
            "avg_score": avg_score,
            "weak":    sum(1 for s in students if float(s.get("performance_score", 0)) < 40),
            "average": sum(1 for s in students if 40 <= float(s.get("performance_score", 0)) <= 75),
            "top":     sum(1 for s in students if float(s.get("performance_score", 0)) > 75),
            "students": students,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /teacher/predict
# Called by: analyticsService.predictScore()
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/predict", methods=["POST"])
@teacher_required
def predict():
    data = request.get_json(silent=True) or {}
    try:
        attendance       = float(data.get("attendance", 0))
        study_hours      = float(data.get("study_hours", 0))
        test_score       = float(data.get("test_score") or data.get("prev_score") or 0)
        assignment_score = float(
            data.get("assignment_score") or data.get("assignments_completed") or 0
        )
        result = predict_single(attendance, study_hours, test_score, assignment_score)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /teacher/predict/bulk
# Called by: analyticsService.bulkPredict()
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/predict/bulk", methods=["POST"])
@teacher_required
def predict_bulk_route():
    data = request.get_json(silent=True) or {}
    records = data.get("records") if isinstance(data, dict) else data
    if not isinstance(records, list):
        # If no body, run on all students
        all_students = _get_all_students()
        records = all_students

    try:
        results = predict_bulk(records)
        # Persist results back to DB
        for res in results:
            sid = res.get("student_id") or res.get("id")
            if sid:
                perf = StudentPerformance.query.filter_by(student_id=sid).first()
                if perf:
                    perf.prediction_result = res["prediction_result"]
                    perf.risk_percentage   = res["risk_percentage"]
        db.session.commit()
        return jsonify({"results": results, "count": len(results)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /teacher/refresh
# Called by: analyticsService.refreshDashboard()
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/refresh", methods=["POST"])
@teacher_required
def refresh():
    try:
        perfs = (
            db.session.query(StudentPerformance, User)
            .join(User, StudentPerformance.student_id == User.id)
            .all()
        )
        updated = 0
        for perf, user in perfs:
            analysis = _run_ml(perf)
            _update_perf_from_ml(perf, analysis)
            updated += 1
        db.session.commit()
        return jsonify({"message": f"Refreshed {updated} student records.", "updated": updated}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /teacher/export-csv
# ─────────────────────────────────────────────────────────────────────────────

@teacher_bp.route("/teacher/export-csv", methods=["GET"])
@teacher_required
def export_csv():
    try:
        students = _get_all_students()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "username", "name", "branch", "batch",
            "attendance", "study_hours", "test_score", "prev_score",
            "assignment_score", "assignments_completed",
            "performance_score", "predicted_performance",
            "prediction_result", "category", "risk_level",
            "risk_percentage",
        ])
        for s in students:
            writer.writerow([
                s.get("username", ""),         s.get("name", ""),
                s.get("branch", ""),           s.get("batch", ""),
                s.get("attendance", 0),        s.get("study_hours", 0),
                s.get("test_score", 0),        s.get("prev_score", 0),
                s.get("assignment_score", 0),  s.get("assignments_completed", 0),
                s.get("performance_score", 0), s.get("predicted_performance", 0),
                s.get("prediction_result", ""), s.get("category", ""),
                s.get("risk_level", ""),        s.get("risk_percentage", 0),
            ])
        response = make_response(output.getvalue())
        response.headers["Content-Type"] = "text/csv"
        response.headers["Content-Disposition"] = 'attachment; filename="all_students.csv"'
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500