# routes/student_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from database import db
from models.user import User
from models.student_performance import StudentPerformance
from middleware.rbac import student_required
from ml.predictor import predict_single

student_bp = Blueprint("student", __name__)


def _get_my_record(user_id: int):
    user = User.query.get(int(user_id))
    if not user:
        return None, None
    perf = StudentPerformance.query.filter_by(student_id=int(user_id)).first()
    return user, perf


def _run_ml(perf: StudentPerformance) -> dict:
    return predict_single(
        attendance=perf.attendance       or 0.0,
        study_hours=perf.study_hours     or 0.0,
        test_score=perf.test_score       or 0.0,
        assignment_score=perf.assignment_score or 0.0,
    )


def _empty_record(user):
    return {
        "id": user.id, "username": user.username, "name": user.username,
        "branch": user.branch, "batch": user.branch, "role": user.role,
        "attendance": 0, "study_hours": 0,
        "test_score": 0, "prev_score": 0, "internal_marks": 0,
        "assignment_score": 0, "assignments_completed": 0,
        "prediction_result": "Unanalyzed", "category": "Unanalyzed",
        "risk_level": "Unanalyzed", "risk_percentage": 0,
        "performance_score": 0, "predicted_performance": 0,
        "analysis": None,
    }


def _safe_float(value):
    """Convert value to float, return None if blank or unconvertible."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _resolve_test_score(data: dict, current: float) -> float:
    for key in ("test_score", "prev_score", "internal_marks"):
        if key in data:
            v = _safe_float(data[key])
            if v is not None:
                return v
    return current


def _resolve_assignment_score(data: dict, current: float) -> float:
    for key in ("assignment_score", "assignments_completed", "assignment_submitted"):
        if key in data:
            v = _safe_float(data[key])
            if v is not None:
                return v
    return current


# ── GET /student/me ────────────────────────────────────────────────────────────

@student_bp.route("/student/me", methods=["GET"])
@student_required
def student_me():
    user_id = get_jwt_identity()
    user, perf = _get_my_record(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
    if perf is None:
        return jsonify(_empty_record(user)), 200
    analysis = _run_ml(perf)
    result = perf.to_dict(user=user, analysis=analysis)
    result["analysis"] = analysis
    return jsonify(result), 200


# ── GET /student/report ────────────────────────────────────────────────────────

@student_bp.route("/student/report", methods=["GET"])
@student_required
def student_report():
    user_id = get_jwt_identity()
    user, perf = _get_my_record(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
    if perf is None:
        return jsonify(_empty_record(user)), 200
    analysis = _run_ml(perf)
    result = perf.to_dict(user=user, analysis=analysis)
    result["analysis"] = analysis
    return jsonify(result), 200


# ── GET /student/dashboard ─────────────────────────────────────────────────────

@student_bp.route("/student/dashboard", methods=["GET"])
@student_required
def student_dashboard():
    user_id = get_jwt_identity()
    user, perf = _get_my_record(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
    if perf is None:
        return jsonify(_empty_record(user)), 200
    analysis = _run_ml(perf)
    result = perf.to_dict(user=user, analysis=analysis)
    result["analysis"] = analysis
    return jsonify(result), 200


# ── PUT /student/update ────────────────────────────────────────────────────────

@student_bp.route("/student/update", methods=["PUT"])
@student_required
def student_update():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    user, perf = _get_my_record(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    if perf is None:
        perf = StudentPerformance(
            student_id=int(user_id),
            username=user.username,
            attendance=0.0, study_hours=0.0,
            test_score=0.0, assignment_score=0.0,
        )
        db.session.add(perf)

    if "attendance" in data:
        v = _safe_float(data["attendance"])
        if v is not None:
            perf.attendance = v
    if "study_hours" in data:
        v = _safe_float(data["study_hours"])
        if v is not None:
            perf.study_hours = v

    perf.test_score       = _resolve_test_score(data, perf.test_score or 0.0)
    perf.assignment_score = _resolve_assignment_score(data, perf.assignment_score or 0.0)

    # Safety: ensure no None reaches ML
    perf.attendance       = perf.attendance       or 0.0
    perf.study_hours      = perf.study_hours      or 0.0
    perf.test_score       = perf.test_score       or 0.0
    perf.assignment_score = perf.assignment_score or 0.0

    try:
        analysis = _run_ml(perf)
        perf.prediction_result = analysis["prediction_result"]
        perf.risk_percentage   = analysis["risk_percentage"]
        db.session.commit()
        result = perf.to_dict(user=user, analysis=analysis)
        result["analysis"] = analysis
        return jsonify({"message": "Updated successfully.", "record": result, "analysis": analysis}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
