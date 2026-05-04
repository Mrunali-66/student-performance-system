# backend/routes/student_routes.py
import sys, os

# Make both backend/ and the project root (where ml/ lives) importable
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, BASE_DIR)                                     # project root → finds ml/
sys.path.insert(1, os.path.join(BASE_DIR, 'backend'))            # backend/     → finds models/, utils/

from flask import Blueprint, request, jsonify
import psycopg2.extras
from models.db import get_connection
from utils.csv_handler import sync_csv_from_db
from ml import (run_analysis, get_weak_students, get_top_students,
                get_individual_analysis, calculate_performance, categorize)

student_bp = Blueprint('students', __name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _fetch_all(conn) -> list:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM students ORDER BY id")
        return [dict(r) for r in cur.fetchall()]


def _push_scores(conn):
    """Recalculate performance_score/category for every student and persist to DB."""
    students = _fetch_all(conn)
    sync_csv_from_db(students)          # keep CSV in sync as a side-effect
    with conn.cursor() as cur:
        for s in students:
            score = calculate_performance(
                s['attendance'], s['study_hours'],
                s['prev_score'], s['assignments_completed']
            )
            cat = categorize(score)
            cur.execute(
                "UPDATE students SET performance_score=%s, category=%s WHERE id=%s",
                (score, cat, s['id'])
            )
    conn.commit()
    return run_analysis()               # returns fresh summary from DB


# ─── Routes ───────────────────────────────────────────────────────────────────

@student_bp.route('/students', methods=['POST'])
def add_student():
    data = request.get_json()
    required = ['name', 'attendance', 'study_hours', 'prev_score', 'assignments_completed']
    for f in required:
        if f not in data or data[f] == '':
            return jsonify({'error': f'Missing field: {f}'}), 400
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """INSERT INTO students
                   (name, batch, attendance, study_hours, prev_score, assignments_completed)
                   VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
                (data['name'].strip(), data.get('batch', '').strip(),
                 float(data['attendance']), float(data['study_hours']),
                 float(data['prev_score']), float(data['assignments_completed']))
            )
            new_student = dict(cur.fetchone())
        conn.commit()
        summary = _push_scores(conn)
        conn.close()
        return jsonify({'student': new_student, 'analysis': summary}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/students', methods=['GET'])
def get_students():
    try:
        conn = get_connection()
        students = _fetch_all(conn)
        conn.close()
        return jsonify(students), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/students/<int:sid>', methods=['GET'])
def get_student(sid):
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM students WHERE id=%s", (sid,))
            s = cur.fetchone()
        conn.close()
        if not s:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(dict(s)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/students/<int:sid>/analysis', methods=['GET'])
def individual_analysis(sid):
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM students WHERE id=%s", (sid,))
            s = cur.fetchone()
        conn.close()
        if not s:
            return jsonify({'error': 'Student not found'}), 404
        analysis = get_individual_analysis(dict(s))
        return jsonify({**dict(s), **analysis}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/students/<int:sid>', methods=['PUT'])
def update_student(sid):
    data = request.get_json()
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """UPDATE students
                   SET name=%s, batch=%s, attendance=%s,
                       study_hours=%s, prev_score=%s, assignments_completed=%s
                   WHERE id=%s RETURNING *""",
                (data['name'].strip(), data.get('batch', '').strip(),
                 float(data['attendance']), float(data['study_hours']),
                 float(data['prev_score']), float(data['assignments_completed']), sid)
            )
            updated = cur.fetchone()
        conn.commit()
        if not updated:
            conn.close()
            return jsonify({'error': 'Not found'}), 404
        summary = _push_scores(conn)
        conn.close()
        return jsonify({'student': dict(updated), 'analysis': summary}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/students/<int:sid>', methods=['DELETE'])
def delete_student(sid):
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM students WHERE id=%s RETURNING id", (sid,))
            deleted = cur.fetchone()
        conn.commit()
        if not deleted:
            conn.close()
            return jsonify({'error': 'Not found'}), 404
        summary = _push_scores(conn)
        conn.close()
        return jsonify({'message': 'Deleted', 'analysis': summary}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/analysis', methods=['GET'])
def get_analysis():
    try:
        return jsonify(run_analysis()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/weak-students', methods=['GET'])
def weak_students():
    try:
        return jsonify(get_weak_students()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@student_bp.route('/top-students', methods=['GET'])
def top_students():
    try:
        return jsonify(get_top_students()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
