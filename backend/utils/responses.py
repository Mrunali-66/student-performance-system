# utils/responses.py — Standardized JSON response helpers
from flask import jsonify


def success(data: dict, status: int = 200):
    return jsonify(data), status


def error(message: str, status: int = 400):
    return jsonify({"error": message}), status
