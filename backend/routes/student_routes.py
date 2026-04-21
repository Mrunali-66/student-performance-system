"""
Student Routes — EduTrack
Fields: name, batch, attendance, study_hours, prev_score, assignments_completed
Extra: GET /students/<id>/analysis  → individual student analysis
"""
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from flask import Blueprint, request, jsonify
import psycopg2.extras
from models.db import get_connection
from utils.csv_handler import sync_csv_from_db
from ml.analyze_students import (run_analysis, get_weak_students,
                                  get_top_students, get_individual_analysis,
                                  calculate_performance, categorize)

student_bp = Blueprint('students', __name__)

def _fetch_all(conn):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM students ORDER BY id")
        return [dict(r) for r in cur.fetchall()]

def _sync_and_analyse(conn):
    students = _fetch_all(conn)
    sync_csv_from_db(students)
    summary = run_analysis()
    # Push scores back to DB
    import pandas as pd
    csv_path = os.path.join(os.path.dirname(__file__),'..','..','dataset','students.csv')
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        with conn.cursor() as cur:
            for _, row in df.iterrows():
                cur.execute("UPDATE students SET performance_score=%s, category=%s WHERE id=%s",
                    (row.get('performance_score',0), row.get('category','Unanalyzed'), int(row['id'])))
        conn.commit()
    return summary

# ── POST /students ─────────────────────────────────────────────────────────────
@student_bp.route('/students', methods=['POST'])
def add_student():
    data = request.get_json()
    required = ['name','attendance','study_hours','prev_score','assignments_completed']
    for f in required:
        if f not in data or data[f] == '':
            return jsonify({'error': f'Missing field: {f}'}), 400
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""INSERT INTO students
                (name,batch,attendance,study_hours,prev_score,assignments_completed)
                VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
                (data['name'].strip(), data.get('batch','').strip(),
                 float(data['attendance']), float(data['study_hours']),
                 float(data['prev_score']), float(data['assignments_completed'])))
            new_student = dict(cur.fetchone())
        conn.commit()
        summary = _sync_and_analyse(conn)
        conn.close()
        return jsonify({'student': new_student, 'analysis': summary}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── GET /students ──────────────────────────────────────────────────────────────
@student_bp.route('/students', methods=['GET'])
def get_students():
    try:
        conn = get_connection()
        students = _fetch_all(conn)
        conn.close()
        return jsonify(students), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── GET /students/<id> ─────────────────────────────────────────────────────────
@student_bp.route('/students/<int:sid>', methods=['GET'])
def get_student(sid):
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM students WHERE id=%s", (sid,))
            s = cur.fetchone()
        conn.close()
        if not s: return jsonify({'error': 'Not found'}), 404
        return jsonify(dict(s)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── GET /students/<id>/analysis ── Individual analysis ─────────────────────────
@student_bp.route('/students/<int:sid>/analysis', methods=['GET'])
def individual_analysis(sid):
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM students WHERE id=%s", (sid,))
            s = cur.fetchone()
        conn.close()
        if not s: return jsonify({'error': 'Student not found'}), 404
        analysis = get_individual_analysis(dict(s))
        return jsonify({**dict(s), **analysis}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── PUT /students/<id> ─────────────────────────────────────────────────────────
@student_bp.route('/students/<int:sid>', methods=['PUT'])
def update_student(sid):
    data = request.get_json()
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""UPDATE students SET name=%s,batch=%s,attendance=%s,
                study_hours=%s,prev_score=%s,assignments_completed=%s
                WHERE id=%s RETURNING *""",
                (data['name'].strip(), data.get('batch','').strip(),
                 float(data['attendance']), float(data['study_hours']),
                 float(data['prev_score']), float(data['assignments_completed']), sid))
            updated = cur.fetchone()
        conn.commit()
        if not updated: conn.close(); return jsonify({'error': 'Not found'}), 404
        summary = _sync_and_analyse(conn)
        conn.close()
        return jsonify({'student': dict(updated), 'analysis': summary}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── DELETE /students/<id> ──────────────────────────────────────────────────────
@student_bp.route('/students/<int:sid>', methods=['DELETE'])
def delete_student(sid):
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM students WHERE id=%s RETURNING id", (sid,))
            deleted = cur.fetchone()
        conn.commit()
        if not deleted: conn.close(); return jsonify({'error': 'Not found'}), 404
        summary = _sync_and_analyse(conn)
        conn.close()
        return jsonify({'message': 'Deleted', 'analysis': summary}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── GET /analysis ──────────────────────────────────────────────────────────────
@student_bp.route('/analysis', methods=['GET'])
def get_analysis():
    try: return jsonify(run_analysis()), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── GET /weak-students ─────────────────────────────────────────────────────────
@student_bp.route('/weak-students', methods=['GET'])
def weak_students():
    try: return jsonify(get_weak_students()), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

# ── GET /top-students ──────────────────────────────────────────────────────────
@student_bp.route('/top-students', methods=['GET'])
def top_students():
    try: return jsonify(get_top_students()), 200
    except Exception as e: return jsonify({'error': str(e)}), 500
