"""
ml/predictor.py  —  EduTrack ML Prediction Engine

Classifier : RandomForestClassifier (scikit-learn Pipeline + StandardScaler)
Labels     : Weak / Average / Strong

Training data (priority order):
  1. dataset/students.csv  — real labelled data (preferred)
  2. Synthetic data        — 2000 rows generated on startup

Path layout:
    <project_root>/
        ml/
            predictor.py    ← this file
        dataset/
            students.csv    ← real training data

Public API:
    predict_single(attendance, study_hours, test_score, assignment_score) -> dict
    predict_bulk(records: list[dict]) -> list[dict]

Thread-safe singleton: built exactly once, reused.
"""

from __future__ import annotations

import os
import threading
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Path resolution — always relative to THIS file
# ---------------------------------------------------------------------------
_ML_DIR      = os.path.dirname(os.path.abspath(__file__))   # …/ml/
_PROJECT_DIR = os.path.dirname(_ML_DIR)                      # …/project/
_CSV_PATH    = os.path.join(_PROJECT_DIR, "dataset", "students.csv")

# ---------------------------------------------------------------------------
# Singleton state
# ---------------------------------------------------------------------------
_lock:  threading.Lock  = threading.Lock()
_model: Pipeline | None = None

# ---------------------------------------------------------------------------
# Label registry
# ---------------------------------------------------------------------------
LABELS        = ["Weak", "Average", "Strong"]
_LABEL_TO_IDX = {lbl: i for i, lbl in enumerate(LABELS)}

_FEATURE_COLS = ["attendance", "study_hours", "test_score", "assignment_score"]
_LABEL_COL    = "label"

_WEAK_THRESHOLD    = 40.0
_AVERAGE_THRESHOLD = 75.0


# ---------------------------------------------------------------------------
# Composite score formula (matches spec exactly)
# ---------------------------------------------------------------------------
def _performance_score(attendance: float, study_hours: float,
                       test_score: float, assignment_score: float) -> float:
    raw = (
        attendance * 0.30
        + min(study_hours * 1.5, 25.0)
        + test_score * 0.30
        + min(assignment_score * 0.15, 15.0)
    )
    return round(min(100.0, max(0.0, raw)), 2)


def _label_from_score(score: float) -> str:
    if score < _WEAK_THRESHOLD:
        return "Weak"
    if score <= _AVERAGE_THRESHOLD:
        return "Average"
    return "Strong"


# ---------------------------------------------------------------------------
# Training data loaders
# ---------------------------------------------------------------------------

def _load_real_data() -> tuple[np.ndarray, np.ndarray] | None:
    if not os.path.isfile(_CSV_PATH):
        return None
    try:
        df = pd.read_csv(_CSV_PATH)
    except Exception as exc:
        print(f"[predictor] WARNING: cannot read {_CSV_PATH}: {exc}. Using synthetic data.")
        return None

    required = _FEATURE_COLS + [_LABEL_COL]
    missing  = [c for c in required if c not in df.columns]
    if missing:
        print(f"[predictor] WARNING: CSV missing columns {missing}. Using synthetic data.")
        return None

    df = df[required].dropna()
    if df.empty:
        print("[predictor] WARNING: no usable rows after dropna. Using synthetic data.")
        return None

    unknown = set(df[_LABEL_COL].unique()) - set(LABELS)
    if unknown:
        print(f"[predictor] WARNING: unknown labels {unknown}. Using synthetic data.")
        return None

    X = df[_FEATURE_COLS].to_numpy(dtype=float)
    y = df[_LABEL_COL].map(_LABEL_TO_IDX).to_numpy(dtype=int)

    counts = {lbl: int((y == idx).sum()) for lbl, idx in _LABEL_TO_IDX.items()}
    print(
        f"[predictor] INFO: loaded {len(df)} rows from dataset/students.csv "
        f"(Weak={counts['Weak']}, Average={counts['Average']}, Strong={counts['Strong']})"
    )
    return X, y


def _generate_training_data(n_samples: int = 2_000) -> tuple[np.ndarray, np.ndarray]:
    print(
        "[predictor] WARNING: dataset/students.csv not found or unusable. "
        "Training on 2000 synthetic samples."
    )
    rng = np.random.default_rng(42)
    attendance       = rng.uniform(0,   100, n_samples)
    study_hours      = rng.uniform(0,    25, n_samples)
    test_score       = rng.uniform(0,   100, n_samples)
    assignment_score = rng.uniform(0,   100, n_samples)

    X = np.column_stack([attendance, study_hours, test_score, assignment_score])
    y = np.array([
        _LABEL_TO_IDX[_label_from_score(
            _performance_score(att, study, test, asgn)
        )]
        for att, study, test, asgn in X
    ], dtype=int)
    return X, y


# ---------------------------------------------------------------------------
# Pipeline builder
# ---------------------------------------------------------------------------

def _build_model() -> Pipeline:
    result = _load_real_data()
    X, y   = result if result is not None else _generate_training_data()

    pipeline = Pipeline([
        ("scaler",     StandardScaler()),
        ("classifier", RandomForestClassifier(
            n_estimators=200,
            max_depth=8,
            min_samples_split=4,
            random_state=42,
            n_jobs=-1,
        )),
    ])
    pipeline.fit(X, y)
    print("[predictor] Model trained successfully.")
    return pipeline


def _get_model() -> Pipeline:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                _model = _build_model()
    return _model


# ---------------------------------------------------------------------------
# Feature helpers
# ---------------------------------------------------------------------------

def _to_feature_vector(attendance, study_hours, test_score, assignment_score) -> np.ndarray:
    return np.array([[attendance, study_hours, test_score, assignment_score]], dtype=float)


def _compute_risk_percentage(proba: np.ndarray) -> float:
    """Probability of 'Weak' class (index 0) as 0–100%."""
    return round(float(proba[0]) * 100, 1)


def _compute_score_breakdown(attendance, study_hours, test_score, assignment_score) -> dict:
    return {
        "attendance_contribution":   round(attendance * 0.30, 2),
        "study_contribution":        round(min(study_hours * 1.5, 25.0), 2),
        "test_score_contribution":   round(test_score * 0.30, 2),
        "assignments_contribution":  round(min(assignment_score * 0.15, 15.0), 2),
    }


def _build_insights(attendance, study_hours, test_score, assignment_score):
    strengths:   list[str] = []
    weaknesses:  list[str] = []
    suggestions: list[str] = []

    if attendance >= 80:
        strengths.append("Excellent attendance")
    elif attendance >= 60:
        strengths.append("Decent attendance")
    else:
        weaknesses.append("Poor attendance")
        suggestions.append("Improve attendance to at least 75%")

    if study_hours >= 15:
        strengths.append("Strong weekly study hours")
    elif study_hours >= 8:
        strengths.append("Moderate study commitment")
    else:
        weaknesses.append("Insufficient study hours")
        suggestions.append("Increase weekly study hours to at least 15")

    if test_score >= 70:
        strengths.append("Strong test performance")
    elif test_score >= 50:
        strengths.append("Average test performance")
    else:
        weaknesses.append("Low test score")
        suggestions.append("Revise fundamentals and attempt practice tests")

    if assignment_score >= 80:
        strengths.append("Consistent assignment completion")
    elif assignment_score >= 50:
        strengths.append("Moderate assignment completion")
    else:
        weaknesses.append("Poor assignment completion")
        suggestions.append("Complete all assignments on time")

    if not suggestions:
        suggestions.append("Keep up the excellent work!")

    return strengths, weaknesses, suggestions


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def predict_single(
    attendance: float,
    study_hours: float,
    test_score: float,
    assignment_score: float,
) -> dict[str, Any]:
    """
    Run RandomForestClassifier on one student's features.

    Returns
    -------
    dict with keys:
        prediction_result  – "Weak" | "Average" | "Strong"
        category           – same as prediction_result
        risk_percentage    – float 0-100 (probability of 'Weak')
        performance_score  – float 0-100 (composite formula)
        predicted_performance – same as performance_score
        risk_level         – same as prediction_result
        score_breakdown    – per-feature contributions
        strengths          – list[str]
        weaknesses         – list[str]
        suggestions        – list[str]
        probabilities      – {Weak, Average, Strong: float}
    """
    # Guard: coerce None to 0.0 so comparisons never fail
    attendance       = float(attendance       or 0.0)
    study_hours      = float(study_hours      or 0.0)
    test_score       = float(test_score       or 0.0)
    assignment_score = float(assignment_score or 0.0)

    model = _get_model()

    X     = _to_feature_vector(attendance, study_hours, test_score, assignment_score)
    proba = model.predict_proba(X)[0]
    label = LABELS[int(model.predict(X)[0])]

    strengths, weaknesses, suggestions = _build_insights(
        attendance, study_hours, test_score, assignment_score
    )

    perf_score = _performance_score(attendance, study_hours, test_score, assignment_score)

    return {
        "prediction_result":    label,
        "category":             label,          # alias
        "risk_level":           label,          # alias
        "risk_percentage":      _compute_risk_percentage(proba),
        "performance_score":    perf_score,
        "predicted_performance": perf_score,    # alias
        "score_breakdown":      _compute_score_breakdown(
            attendance, study_hours, test_score, assignment_score
        ),
        "strengths":    strengths,
        "weaknesses":   weaknesses,
        "suggestions":  suggestions,
        "probabilities": {
            "Weak":    round(float(proba[0]) * 100, 1),
            "Average": round(float(proba[1]) * 100, 1),
            "Strong":  round(float(proba[2]) * 100, 1),
        },
    }


def predict_bulk(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Run predictions for a list of student records.
    Each record must contain: attendance, study_hours, test_score, assignment_score.
    Returns the same list with all prediction fields merged in.
    """
    if not records:
        return []

    model = _get_model()

    X = np.array([
        [float(r.get(k, 0)) for k in _FEATURE_COLS]
        for r in records
    ], dtype=float)

    probas  = model.predict_proba(X)
    indices = model.predict(X)

    results: list[dict[str, Any]] = []
    for i, record in enumerate(records):
        att   = float(record.get("attendance",       0))
        study = float(record.get("study_hours",      0))
        test  = float(record.get("test_score",       0))
        asgn  = float(record.get("assignment_score", 0))

        label = LABELS[int(indices[i])]
        proba = probas[i]
        perf_score = _performance_score(att, study, test, asgn)

        strengths, weaknesses, suggestions = _build_insights(att, study, test, asgn)

        results.append({
            **record,
            "prediction_result":     label,
            "category":              label,
            "risk_level":            label,
            "risk_percentage":       _compute_risk_percentage(proba),
            "performance_score":     perf_score,
            "predicted_performance": perf_score,
            "score_breakdown":       _compute_score_breakdown(att, study, test, asgn),
            "strengths":             strengths,
            "weaknesses":            weaknesses,
            "suggestions":           suggestions,
            "probabilities": {
                "Weak":    round(float(proba[0]) * 100, 1),
                "Average": round(float(proba[1]) * 100, 1),
                "Strong":  round(float(proba[2]) * 100, 1),
            },
        })

    return results
