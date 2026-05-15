# middleware/rbac.py — Role-based access control decorators (flask-jwt-extended)
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def teacher_required(f):
    """
    Decorator: validates JWT AND requires role == 'teacher'.
    Combines @jwt_required() + role check in one decorator.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != "teacher":
            return jsonify({"error": "Teacher access required."}), 403
        return f(*args, **kwargs)
    return wrapper


def student_required(f):
    """
    Decorator: validates JWT AND requires role == 'student'.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != "student":
            return jsonify({"error": "Student access required."}), 403
        return f(*args, **kwargs)
    return wrapper


def jwt_required_any(f):
    """
    Decorator: validates JWT, any role accepted.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        return f(*args, **kwargs)
    return wrapper
