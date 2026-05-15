# services/auth_service.py — Business logic for authentication
import bcrypt
from flask_jwt_extended import create_access_token, get_jwt
from database import db
from models.user import User
from models.token_blocklist import TokenBlocklist
from config import ActiveConfig
from utils.validators import validate_register_payload


class AuthService:

    # ── Register ──────────────────────────────────────────────────────────────

    @staticmethod
    def register(data: dict) -> tuple[dict, int]:
        """
        Validate payload, hash password, persist user, return JWT.
        Returns (response_dict, http_status).
        """
        error = validate_register_payload(data)
        if error:
            return {"error": error}, 400

        username = data["username"].strip()
        password = data["password"]
        role     = data["role"].strip().lower()
        branch   = data["branch"].strip()

        if User.query.filter_by(username=username).first():
            return {"error": f"Username '{username}' is already taken."}, 409

        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        user = User(username=username, password=hashed, role=role, branch=branch)
        db.session.add(user)
        db.session.commit()

        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role, "branch": user.branch},
        )

        return {
            "message": "Registration successful.",
            "token": token,
            "user": user.to_dict(),
        }, 201

    # ── Login ─────────────────────────────────────────────────────────────────

    @staticmethod
    def login(data: dict) -> tuple[dict, int]:
        """
        Verify credentials, return JWT on success.
        Returns (response_dict, http_status).
        """
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "")

        if not username or not password:
            return {"error": "Username and password are required."}, 400

        user = User.query.filter_by(username=username).first()

        if not user:
            return {"error": "Invalid username or password."}, 401

        if not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
            return {"error": "Invalid username or password."}, 401

        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role, "branch": user.branch},
        )

        return {
            "message": "Login successful.",
            "token": token,
            "user": user.to_dict(),
        }, 200

    # ── Logout ────────────────────────────────────────────────────────────────

    @staticmethod
    def logout() -> tuple[dict, int]:
        """
        Add the current token's JTI to the blocklist.
        Caller must be inside a jwt_required context.
        """
        jti = get_jwt()["jti"]
        if not TokenBlocklist.query.filter_by(jti=jti).first():
            db.session.add(TokenBlocklist(jti=jti))
            db.session.commit()
        return {"message": "Logged out successfully."}, 200
