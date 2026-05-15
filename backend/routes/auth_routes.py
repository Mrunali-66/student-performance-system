# routes/auth_routes.py — /api/auth/* endpoints + alias routes
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, create_access_token
from services.auth_service import AuthService
from models.user import User
from models.token_blocklist import TokenBlocklist
from database import db
import bcrypt

auth_bp = Blueprint("auth", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# CANONICAL ROUTES  /api/auth/*
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/api/auth/register", methods=["POST"])
def api_auth_register():
    """
    Register a new user.
    Body: { username, password, role, branch }
    Returns 201 with JWT token on success.
    """
    data = request.get_json(silent=True) or {}
    response, status = AuthService.register(data)
    return jsonify(response), status


@auth_bp.route("/api/auth/login", methods=["POST"])
def api_auth_login():
    """
    Authenticate an existing user.
    Body: { username, password }
    Returns 200 with JWT token on success.
    """
    data = request.get_json(silent=True) or {}
    response, status = AuthService.login(data)
    return jsonify(response), status


@auth_bp.route("/api/auth/logout", methods=["POST"])
@jwt_required()
def api_auth_logout():
    """Revoke the current JWT (blocklist its JTI)."""
    response, status = AuthService.logout()
    return jsonify(response), status


@auth_bp.route("/api/auth/me", methods=["GET"])
@jwt_required()
def api_auth_me():
    """Return the currently authenticated user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/api/auth/verify", methods=["GET"])
@jwt_required()
def api_auth_verify():
    """
    Validate stored JWT and return fresh user data.
    Used by AuthContext on page refresh.
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"valid": True, "user": user.to_dict()}), 200


@auth_bp.route("/api/auth/profile", methods=["PUT"])
@jwt_required()
def api_auth_edit_profile():
    """
    Update the authenticated user's profile.
    Body (all fields optional):
      { username, branch, current_password, new_password }
    Returns updated user object + a fresh JWT (so the UI stays in sync).
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json(silent=True) or {}

    # ── username change ───────────────────────────────────────────────────────
    new_username = (data.get("username") or "").strip()
    if new_username and new_username != user.username:
        if User.query.filter_by(username=new_username).first():
            return jsonify({"error": f"Username '{new_username}' is already taken."}), 409
        user.username = new_username

    # ── branch change ─────────────────────────────────────────────────────────
    new_branch = (data.get("branch") or "").strip()
    if new_branch:
        user.branch = new_branch

    # ── password change ───────────────────────────────────────────────────────
    current_password = data.get("current_password") or ""
    new_password     = data.get("new_password") or ""
    if new_password:
        if not current_password:
            return jsonify({"error": "Current password is required to set a new password."}), 400
        if not bcrypt.checkpw(current_password.encode("utf-8"), user.password.encode("utf-8")):
            return jsonify({"error": "Current password is incorrect."}), 401
        if len(new_password) < 6:
            return jsonify({"error": "New password must be at least 6 characters."}), 400
        user.password = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    db.session.commit()

    # Issue a fresh token so updated username/branch propagate immediately
    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "branch": user.branch},
    )

    return jsonify({
        "message": "Profile updated successfully.",
        "token": token,
        "user": user.to_dict(),
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# ALIAS ROUTES — frontend shorthand
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
def login_alias():
    """Alias: frontend authService.js calls POST /login"""
    data = request.get_json(silent=True) or {}
    response, status = AuthService.login(data)
    return jsonify(response), status


@auth_bp.route("/register", methods=["POST"])
def register_alias():
    """Alias: frontend authService.js calls POST /register"""
    data = request.get_json(silent=True) or {}
    response, status = AuthService.register(data)
    return jsonify(response), status


@auth_bp.route("/auth/verify", methods=["GET"])
@jwt_required()
def auth_verify_alias():
    """
    Alias: frontend authService.js calls GET /auth/verify (no /api prefix).
    AuthContext.jsx → authService.verify() → GET /auth/verify
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"valid": True, "user": user.to_dict()}), 200
