"""
utils/auth.py — JWT helpers and RBAC middleware decorators

FIX: teacher_required and student_required no longer double-wrap login_required.
     The original code used @login_required as a decorator inside the wrapper,
     causing the inner function to lose its name and Flask to raise:
       AssertionError: View function mapping is overwriting an existing endpoint function
     Fixed by inlining the token-validation logic in a single wrapper.
"""
import os
import jwt
import datetime
from functools import wraps
from flask import request, jsonify, g
from models.db import get_connection
import psycopg2.extras

JWT_SECRET = os.getenv('JWT_SECRET', 'edutrack_super_secret_jwt_key_2024')
JWT_ALGO   = 'HS256'
JWT_EXP_H  = 24


def generate_token(user_id: int, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role':    role,
        'exp':     datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXP_H),
        'iat':     datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])


def _get_bearer_token():
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:]
    return None


def _load_user_from_token():
    """
    Shared helper: validates JWT, loads user from DB, sets g.current_user.
    Returns (user_dict, None) on success or (None, error_response) on failure.
    """
    token = _get_bearer_token()
    if not token:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        return None, (jsonify({'error': 'Token expired'}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({'error': 'Invalid token'}), 401)

    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, name, email, role FROM users WHERE id=%s", (payload['user_id'],))
            user = cur.fetchone()
        conn.close()
    except Exception:
        return None, (jsonify({'error': 'DB error during auth'}), 500)

    if not user:
        return None, (jsonify({'error': 'User not found'}), 401)

    return dict(user), None


def login_required(f):
    """Decorator: validates JWT and sets g.current_user"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, err = _load_user_from_token()
        if err:
            return err
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def teacher_required(f):
    """Decorator: must be logged in AND role == teacher"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, err = _load_user_from_token()
        if err:
            return err
        if user.get('role') != 'teacher':
            return jsonify({'error': 'Teacher access required'}), 403
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def student_required(f):
    """Decorator: must be logged in AND role == student"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user, err = _load_user_from_token()
        if err:
            return err
        if user.get('role') != 'student':
            return jsonify({'error': 'Student access required'}), 403
        g.current_user = user
        return f(*args, **kwargs)
    return decorated
