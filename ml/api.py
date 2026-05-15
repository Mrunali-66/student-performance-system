"""
ml/api.py — EduTrack ML REST API Server (v2)

Exposes ML predictions via HTTP so the backend can call it as a microservice.
All endpoints return JSON.  Handles missing/invalid input gracefully.

Start:
    python api.py                  # default port 5001
    python api.py --port 5001

Endpoints:
    POST /predict           — single student prediction
    POST /predict/bulk      — multiple students
    POST /predict/weak      — filter + return only weak students
    GET  /analyze           — run full dataset analysis
    GET  /summary           — risk summary
    GET  /trends            — performance trends
    GET  /health            — health check
"""

from __future__ import annotations

import json
import os
import sys
import traceback
from typing import Any

# Flask is optional — only needed when running as a standalone server.
try:
    from flask import Flask, jsonify, request
    from flask_cors import CORS
    _FLASK_AVAILABLE = True
except ImportError:
    _FLASK_AVAILABLE = False

from predictor import predict_single, predict_bulk, get_weak_students, get_class_summary
from analyze_students import (
    run_analysis,
    get_individual_analysis,
    get_all_weak_students,
    get_risk_summary,
    get_performance_trends,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _error(msg: str, code: int = 400):
    return jsonify({"success": False, "error": msg}), code


def _ok(data: Any):
    return jsonify({"success": True, "data": data}), 200


def _parse_student(d: dict) -> dict:
    """Normalise a student input dict: support legacy keys, clamp ranges."""
    # Migrate legacy key
    if "assignment_score" in d and "assignment_submitted" not in d:
        d["assignment_submitted"] = float(d["assignment_score"]) / 10.0

    return {
        "attendance":           float(d.get("attendance",           0)),
        "study_hours":          float(d.get("study_hours",          0)),
        "test_score":           float(d.get("test_score",           0)),
        "assignment_submitted": float(d.get("assignment_submitted",  0)),
        **{k: v for k, v in d.items()
           if k not in ("attendance", "study_hours", "test_score",
                        "assignment_submitted", "assignment_score")},
    }


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app() -> "Flask":
    if not _FLASK_AVAILABLE:
        raise RuntimeError("Flask is not installed. Run: pip install flask flask-cors")

    app = Flask(__name__)
    CORS(app)

    # ── Health ──────────────────────────────────────────────────────────────
    @app.route("/health", methods=["GET"])
    def health():
        return _ok({"status": "ok", "module": "EduTrack ML v2"})

    # ── Single prediction ───────────────────────────────────────────────────
    @app.route("/predict", methods=["POST"])
    def predict():
        try:
            body = request.get_json(force=True, silent=True) or {}
            student = _parse_student(body)
            result  = predict_single(
                student["attendance"],
                student["study_hours"],
                student["test_score"],
                student["assignment_submitted"],
            )
            return _ok(result)
        except Exception as exc:
            traceback.print_exc()
            return _error(str(exc))

    # ── Bulk prediction ─────────────────────────────────────────────────────
    @app.route("/predict/bulk", methods=["POST"])
    def predict_bulk_route():
        try:
            body = request.get_json(force=True, silent=True) or {}
            records = body.get("students", [])
            if not isinstance(records, list):
                return _error("'students' must be a list.")
            cleaned = [_parse_student(r) for r in records]
            results = predict_bulk(cleaned)
            summary = get_class_summary(cleaned)
            return _ok({"predictions": results, "summary": summary})
        except Exception as exc:
            traceback.print_exc()
            return _error(str(exc))

    # ── Weak students ───────────────────────────────────────────────────────
    @app.route("/predict/weak", methods=["POST"])
    def predict_weak_route():
        try:
            body    = request.get_json(force=True, silent=True) or {}
            records = body.get("students", [])
            if not isinstance(records, list):
                return _error("'students' must be a list.")
            cleaned = [_parse_student(r) for r in records]
            weak    = get_weak_students(cleaned)
            return _ok({"weak_students": weak, "count": len(weak)})
        except Exception as exc:
            traceback.print_exc()
            return _error(str(exc))

    # ── Dataset analysis ────────────────────────────────────────────────────
    @app.route("/analyze", methods=["GET"])
    def analyze():
        try:
            return _ok(run_analysis())
        except Exception as exc:
            traceback.print_exc()
            return _error(str(exc), 500)

    # ── Risk summary ────────────────────────────────────────────────────────
    @app.route("/summary", methods=["GET"])
    def summary():
        try:
            return _ok(get_risk_summary())
        except Exception as exc:
            traceback.print_exc()
            return _error(str(exc), 500)

    # ── Weak students from dataset ──────────────────────────────────────────
    @app.route("/weak", methods=["GET"])
    def weak():
        try:
            weak_students = get_all_weak_students()
            return _ok({"weak_students": weak_students, "count": len(weak_students)})
        except Exception as exc:
            traceback.print_exc()
            return _error(str(exc), 500)

    # ── Performance trends ──────────────────────────────────────────────────
    @app.route("/trends", methods=["GET"])
    def trends():
        try:
            return _ok(get_performance_trends())
        except Exception as exc:
            traceback.print_exc()
            return _error(str(exc), 500)

    return app


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="EduTrack ML API Server")
    parser.add_argument("--port", type=int, default=5001, help="Port to listen on")
    parser.add_argument("--host", default="0.0.0.0",    help="Host to bind to")
    parser.add_argument("--debug", action="store_true",  help="Flask debug mode")
    args = parser.parse_args()

    app = create_app()
    print(f"[ML API] Starting on http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)
