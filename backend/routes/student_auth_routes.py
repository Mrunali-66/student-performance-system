"""
student_auth_routes.py — Student-specific RBAC routes

FIX: sys.path manipulation removed — app.py already adds project root to path,
     so `from ml.analyze_students import ...` works without path hacks here.
"""
import io
import csv
import sys, os

from flask import Blueprint, request, jsonify, g, make_response
import psycopg2.extras
from models.db import get_connection
from utils.auth import login_required, student_required
from ml.analyze_students import get_individual_analysis

student_auth_bp = Blueprint('student_auth', __name__)


def _get_performance(student_id: int):
    conn = get_connection()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT sp.*, u.name, u.email, u.role
            FROM student_performance sp
            JOIN users u ON u.id = sp.student_id
            WHERE sp.student_id = %s
        """, (student_id,))
        row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def _recalc_and_save(student_id, attendance, study_hours, assignment_score, internal_marks,
                     remarks='', recommendations='', updated_by_teacher=False):
    student_dict = {
        'attendance':            float(attendance),
        'study_hours':           float(study_hours),
        'prev_score':            float(assignment_score),
        'assignments_completed': float(internal_marks) / 10,
        'assignment_score':      float(assignment_score),
        'internal_marks':        float(internal_marks),
    }

    analysis  = get_individual_analysis(student_dict)
    predicted = analysis['performance_score']
    risk      = analysis['category']

    report_lines = [
        "=== EduTrack Student Analysis Report ===",
        f"Attendance        : {attendance}%",
        f"Study Hours/week  : {study_hours}h",
        f"Assignment Score  : {assignment_score}",
        f"Internal Marks    : {internal_marks}",
        f"Predicted Score   : {predicted}",
        f"Risk Level        : {risk}",
        "",
        f"Strengths: {', '.join(analysis.get('strengths', [])) or 'None'}",
        f"Weaknesses: {', '.join(analysis.get('weaknesses', [])) or 'None'}",
        f"Suggestions: {'; '.join(analysis.get('suggestions', [])) or 'None'}",
    ]
    if remarks:
        report_lines.append(f"\nTeacher Remarks: {remarks}")
    if recommendations:
        report_lines.append(f"Recommendations: {recommendations}")

    report_text = '\n'.join(report_lines)

    conn = get_connection()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            UPDATE student_performance SET
                attendance=%s, study_hours=%s, assignment_score=%s, internal_marks=%s,
                predicted_performance=%s, risk_level=%s, analysis_report=%s,
                remarks=%s, recommendations=%s,
                updated_by_teacher=%s, last_updated=NOW()
            WHERE student_id=%s
            RETURNING *
        """, (
            float(attendance), float(study_hours), float(assignment_score), float(internal_marks),
            predicted, risk, report_text,
            remarks, recommendations,
            updated_by_teacher, student_id
        ))
        updated = cur.fetchone()
    conn.commit()
    conn.close()
    return dict(updated) if updated else None, analysis


# ── GET /student/profile ──────────────────────────────────────────────────────
@student_auth_bp.route('/student/profile', methods=['GET'])
@login_required
def student_profile():
    uid  = g.current_user['id']
    role = g.current_user['role']

    if role == 'teacher':
        target_id = request.args.get('id', type=int)
        if not target_id:
            return jsonify({'error': 'Provide ?id= for teacher profile view'}), 400
    else:
        target_id = uid

    perf = _get_performance(target_id)
    if not perf:
        return jsonify({'error': 'Performance record not found'}), 404
    return jsonify(perf), 200


# ── PUT /student/update ───────────────────────────────────────────────────────
@student_auth_bp.route('/student/update', methods=['PUT'])
@student_required
def student_update():
    data = request.get_json(silent=True) or {}
    uid  = g.current_user['id']

    perf = _get_performance(uid)
    if not perf:
        return jsonify({'error': 'Performance record not found'}), 404

    attendance       = data.get('attendance',       perf['attendance'])
    study_hours      = data.get('study_hours',      perf['study_hours'])
    assignment_score = data.get('assignment_submitted', data.get('assignment_score', perf['assignment_score']))
    internal_marks   = data.get('internal_marks',   perf['internal_marks'])

    updated, analysis = _recalc_and_save(
        uid, attendance, study_hours, assignment_score, internal_marks,
        remarks=perf.get('remarks', ''),
        recommendations=perf.get('recommendations', ''),
        updated_by_teacher=perf.get('updated_by_teacher', False)
    )
    return jsonify({'record': updated, 'analysis': analysis}), 200


# ── GET /student/report ───────────────────────────────────────────────────────
@student_auth_bp.route('/student/report', methods=['GET'])
@login_required
def student_report():
    uid  = g.current_user['id']
    role = g.current_user['role']

    if role == 'teacher':
        target_id = request.args.get('id', type=int)
        if not target_id:
            return jsonify({'error': 'Provide ?id= for teacher report view'}), 400
    else:
        target_id = uid

    perf = _get_performance(target_id)
    if not perf:
        return jsonify({'error': 'No performance record'}), 404

    student_dict = {
        'attendance':            perf['attendance'],
        'study_hours':           perf['study_hours'],
        'prev_score':            perf['assignment_score'],
        'assignments_completed': perf['internal_marks'] / 10,
        'assignment_score':      perf['assignment_score'],
        'internal_marks':        perf['internal_marks'],
    }
    analysis = get_individual_analysis(student_dict)

    return jsonify({
        **perf,
        'analysis': analysis,
    }), 200


# ── GET /student/export-csv ───────────────────────────────────────────────────
@student_auth_bp.route('/student/export-csv', methods=['GET'])
@student_required
def student_export_csv():
    uid  = g.current_user['id']
    perf = _get_performance(uid)
    if not perf:
        return jsonify({'error': 'No record found'}), 404

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['name', 'attendance', 'study_hours', 'assignment_score',
                     'internal_marks', 'predicted_performance', 'risk_level',
                     'remarks', 'recommendations'])
    writer.writerow([
        perf.get('name', ''),
        perf.get('attendance', 0),
        perf.get('study_hours', 0),
        perf.get('assignment_score', 0),
        perf.get('internal_marks', 0),
        perf.get('predicted_performance', 0),
        perf.get('risk_level', ''),
        perf.get('remarks', ''),
        perf.get('recommendations', ''),
    ])

    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = f'attachment; filename="my_report_{uid}.csv"'
    return response


# ── GET /student/download-report ──────────────────────────────────────────────
@student_auth_bp.route('/student/download-report', methods=['GET'])
@student_required
def student_download_report():
    uid  = g.current_user['id']
    perf = _get_performance(uid)
    if not perf:
        return jsonify({'error': 'No record found'}), 404

    report = perf.get('analysis_report', '') or 'No report generated yet.'
    response = make_response(report)
    response.headers['Content-Type'] = 'text/plain'
    response.headers['Content-Disposition'] = f'attachment; filename="analysis_report_{uid}.txt"'
    return response
