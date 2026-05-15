# app.py — Application factory and entry point
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

load_dotenv()

from config import ActiveConfig
from database import db
from models.token_blocklist import TokenBlocklist


def create_app(config=None) -> Flask:
    app = Flask(__name__)

    # ── Load config ───────────────────────────────────────────────────────────
    app.config.from_object(config or ActiveConfig)

    # ── Extensions ────────────────────────────────────────────────────────────
    db.init_app(app)

    CORS(
        app,
        origins=[
            app.config["FRONTEND_URL"],
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    jwt = JWTManager(app)

    # ── JWT: token revocation check ───────────────────────────────────────────
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        return TokenBlocklist.query.filter_by(jti=jti).first() is not None

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired. Please log in again."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token. Please log in again."}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authentication required. No token provided."}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has been revoked. Please log in again."}), 401

    # ── Blueprints ────────────────────────────────────────────────────────────
    from routes.auth_routes import auth_bp
    from routes.teacher_routes import teacher_bp
    from routes.student_routes import student_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(student_bp)

    # ── Global error handlers ─────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error."}), 500

    # ── Health check ──────────────────────────────────────────────────────────
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok",
            "message": "EduTrack Student Performance Management System API is running.",
        }), 200

    # ── Branch list (public) ──────────────────────────────────────────────────
    @app.route("/api/branches", methods=["GET"])
    def branches():
        return jsonify({"branches": ActiveConfig.ALLOWED_BRANCHES}), 200

    # ── Initialize DB tables on startup ──────────────────────────────────────
    with app.app_context():
        try:
            from database.init_db import init_database
            init_database()
            db.create_all()
            print("[App] All tables ready.")
            # Warm up the ML model on startup
            try:
                from ml.predictor import _get_model
                _get_model()
                print("[App] ML model loaded.")
            except Exception as ml_exc:
                print(f"[App] ML model warning: {ml_exc}")
        except Exception as exc:
            print(f"[App] DB init warning: {exc}")

    return app


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    application = create_app()
    port = int(os.getenv("PORT", 5000))
    application.run(host="0.0.0.0", port=port, debug=ActiveConfig.DEBUG)
