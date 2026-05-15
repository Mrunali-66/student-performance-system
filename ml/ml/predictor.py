"""
ml/predictor.py  —  EduTrack ML Prediction Engine

Classifier : GradientBoostingClassifier
Pipeline   : StandardScaler → GradientBoostingClassifier
Labels     : Weak / Average / Strong

Training data (priority order):
  1. dataset/students.csv  — real labelled data (preferred)
  2. Synthetic data        — generated on the fly when CSV is absent (fallback)

Path layout expected on disk:
    <project_root>/
        ml/
            predictor.py        ← this file
        dataset/
            students.csv        ← real training data

Public API (unchanged):
    predict_single(attendance, study_hours, test_score, assignment_score) → dict
    predict_bulk(records: list[dict]) → list[dict]

Thread-safe singleton: the Pipeline is built exactly once and reused.
"""

from __future__ import annotations

import os
import threading
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Path resolution — always relative to THIS file so CWD never matters
# ---------------------------------------------------------------------------
_ML_DIR      = os.path.dirname(os.path.abspath(__file__))        # …/ml/
_PROJECT_DIR = os.path.dirname(_ML_DIR)                           # …/project/
_CSV_PATH    = os.path.join(_PROJECT_DIR, "dataset", "students.csv")

# ---------------------------------------------------------------------------
# Singleton state
# ---------------------------------------------------------------------------
_lock:  threading.Lock  = threading.Lock()
_model: Pipeline | None = None   # type: ignore[type-arg]

# ---------------------------------------------------------------------------
# Label registry  (order defines class indices 0 / 1 / 2)
# ---------------------------------------------------------------------------
LABELS        = ["Weak", "Average", "Strong"]
_LABEL_TO_IDX = {lbl: i for i, lbl in enumerate(LABELS)}

# Expected CSV columns
_FEATURE_COLS = ["attendance", "study_hours", "test_score", "assignment_score"]
_LABEL_COL    = "label"

# Score thresholds — mirror scorer.py — used only for synthetic fallback
_WEAK_THRESHOLD    = 40.0
_AVERAGE_THRESHOLD = 75.0


# ---------------------------------------------------------------------------
# Training-data loaders
# ---------------------------------------------------------------------------

def _load_real_data() -> tuple[np.ndarray, np.ndarray] | None:
    """
    Load features + labels from dataset/students.csv.

    Steps:
      - Return None (triggering synthetic fallback) if the file is missing,
        unreadable, has wrong columns, or has unknown label values.
      - Drop rows with any missing values before use.
    """
    if not os.path.isfile(_CSV_PATH):
        return None

    try:
        df = pd.read_csv(_CSV_PATH)
    except Exception as exc:
        print(f"[predictor] WARNING: could not read {_CSV_PATH}: {exc}. "
              "Falling back to synthetic data.")
        return None

    required = _FEATURE_COLS + [_LABEL_COL]
    missing_cols = [c for c in required if c not in df.columns]
    if missing_cols:
        print(f"[predictor] WARNING: {_CSV_PATH} is missing columns "
              f"{missing_cols}. Falling back to synthetic data.")
        return None

    # Drop rows with any NaN in the columns we care about
    before = len(df)
    df = df[required].dropna()
    dropped = before - len(df)
    if dropped:
        print(f"[predictor] INFO: dropped {dropped} row(s) with missing "
              f"values from {_CSV_PATH}.")

    if df.empty:
        print(f"[predictor] WARNING: {_CSV_PATH} has no usable rows after "
              "dropping NaNs. Falling back to synthetic data.")
        return None

    unknown_labels = set(df[_LABEL_COL].unique()) - set(LABELS)
    if unknown_labels:
        print(f"[predictor] WARNING: unknown label value(s) {unknown_labels} "
              "in CSV. Falling back to synthetic data.")
        return None

    X = df[_FEATURE_COLS].to_numpy(dtype=float)
    y = df[_LABEL_COL].map(_LABEL_TO_IDX).to_numpy(dtype=int)

    counts = {lbl: int((y == idx).sum()) for lbl, idx in _LABEL_TO_IDX.items()}
    print(f"[predictor] INFO: loaded {len(df)} rows from dataset/students.csv  "
          f"(Weak={counts['Weak']}, Average={counts['Average']}, "
          f"Strong={counts['Strong']})")
    return X, y


# ---------------------------------------------------------------------------
# Synthetic fallback
# ---------------------------------------------------------------------------

def _performance_score(attendance: float, study_hours: float,
                       test_score: float, assignment_score: float) -> float:
    """Mirrors scorer.calculate_performance. Returns a 0-100 float."""
    raw = (
        attendance * 0.30
        + min(study_hours * 1.5, 25.0)
        + test_score * 0.30
        + min(assignment_score * 2.0, 15.0)
    )
    return round(min(100.0, max(0.0, raw)), 2)


def _label_from_score(score: float) -> str:
    if score < _WEAK_THRESHOLD:
        return "Weak"
    if score <= _AVERAGE_THRESHOLD:
        return "Average"
    return "Strong"


def _generate_training_data(n_samples: int = 2_000) -> tuple[np.ndarray, np.ndarray]:
    """
    Synthesise a balanced training set spanning the full feature space.
    Ground-truth labels come from the same formula used in scorer.py so
    decision boundaries stay consistent across the project.
    """
    print("[predictor] WARNING: dataset/students.csv not found or unusable. "
          "Training on synthetic data — provide a real CSV for better accuracy.")

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
    """
    Try real CSV first; fall back to synthetic data if unavailable.
    Fits and returns the StandardScaler → GradientBoostingClassifier pipeline.
    """
    result = _load_real_data()
    X, y   = result if result is not None else _generate_training_data()

    pipeline = Pipeline([
        ("scaler",     StandardScaler()),
        ("classifier", GradientBoostingClassifier(
            n_estimators  = 200,
            learning_rate = 0.1,
            max_depth     = 4,
            subsample     = 0.8,
            random_state  = 42,
        )),
    ])
    pipeline.fit(X, y)
    return pipeline


def _get_model() -> Pipeline:
    """Return the singleton pipeline, initialising it on first call."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:   # double-checked locking
                _model = _build_model()
    return _model


# ---------------------------------------------------------------------------
# Pure feature helpers
# ---------------------------------------------------------------------------

def _to_feature_vector(attendance: float, study_hours: float,
                       test_score: float, assignment_score: float) -> np.ndarray:
    return np.array([[attendance, study_hours, test_score, assignment_score]],
                    dtype=float)


def _compute_risk_percentage(proba: np.ndarray) -> float:
    """Probability of being 'Weak' (class index 0), expressed as 0-100%."""
    return round(float(proba[0]) * 100, 1)


def _compute_score_breakdown(attendance: float, study_hours: float,
                              test_score: float,
                              assignment_score: float) -> dict[str, float]:
    return {
        "attendance_contribution":   round(attendance * 0.30, 2),
        "study_contribution":        round(min(study_hours * 1.5, 25.0), 2),
        "test_score_contribution":   round(test_score * 0.30, 2),
        "assignment_contribution":   round(min(assignment_score * 2.0, 15.0), 2),
    }


def _build_insights(attendance: float, study_hours: float,
                    test_score: float, assignment_score: float
                    ) -> tuple[list[str], list[str], list[str]]:
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
        suggestions.append("Increase weekly study hours to 15+")

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

def predict_single(attendance: float, study_hours: float,
                   test_score: float, assignment_score: float) -> dict[str, Any]:
    """
    Run the GradientBoostingClassifier on one student's features.

    Parameters
    ----------
    attendance       : 0-100 (percentage)
    study_hours      : hours studied per week
    test_score       : 0-100
    assignment_score : 0-100 (percentage / score)

    Returns
    -------
    dict with keys:
        prediction_result  – "Weak" | "Average" | "Strong"
        risk_percentage    – float 0-100 (probability of 'Weak' class)
        performance_score  – float 0-100 (formula-derived score)
        score_breakdown    – dict of per-feature contributions
        strengths          – list[str]
        weaknesses         – list[str]
        suggestions        – list[str]
        probabilities      – {"Weak": float, "Average": float, "Strong": float}
    """
    model = _get_model()

    X     = _to_feature_vector(attendance, study_hours, test_score, assignment_score)
    proba = model.predict_proba(X)[0]
    label = LABELS[int(model.predict(X)[0])]

    strengths, weaknesses, suggestions = _build_insights(
        attendance, study_hours, test_score, assignment_score
    )

    return {
        "prediction_result": label,
        "risk_percentage":   _compute_risk_percentage(proba),
        "performance_score": _performance_score(attendance, study_hours,
                                                test_score, assignment_score),
        "score_breakdown":   _compute_score_breakdown(attendance, study_hours,
                                                      test_score, assignment_score),
        "strengths":         strengths,
        "weaknesses":        weaknesses,
        "suggestions":       suggestions,
        "probabilities": {
            "Weak":    round(float(proba[0]) * 100, 1),
            "Average": round(float(proba[1]) * 100, 1),
            "Strong":  round(float(proba[2]) * 100, 1),
        },
    }


def predict_bulk(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Run predictions for a list of student records.

    Each record must contain:
        attendance, study_hours, test_score, assignment_score

    Returns the same list with all prediction fields merged in.
    """
    if not records:
        return []

    model = _get_model()

    X = np.array([
        [float(r.get(k, 0)) for k in _FEATURE_COLS]
        for r in records
    ], dtype=float)

    probas  = model.predict_proba(X)   # (n, 3)
    indices = model.predict(X)         # (n,)

    results: list[dict[str, Any]] = []
    for i, record in enumerate(records):
        att   = float(record.get("attendance",       0))
        study = float(record.get("study_hours",      0))
        test  = float(record.get("test_score",       0))
        asgn  = float(record.get("assignment_score", 0))

        label = LABELS[int(indices[i])]
        proba = probas[i]

        strengths, weaknesses, suggestions = _build_insights(att, study, test, asgn)

        results.append({
            **record,
            "prediction_result": label,
            "risk_percentage":   _compute_risk_percentage(proba),
            "performance_score": _performance_score(att, study, test, asgn),
            "score_breakdown":   _compute_score_breakdown(att, study, test, asgn),
            "strengths":         strengths,
            "weaknesses":        weaknesses,
            "suggestions":       suggestions,
            "probabilities": {
                "Weak":    round(float(proba[0]) * 100, 1),
                "Average": round(float(proba[1]) * 100, 1),
                "Strong":  round(float(proba[2]) * 100, 1),
            },
        })

    return results
