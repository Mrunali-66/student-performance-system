"""
ml/predictor.py  —  EduTrack Standalone ML Module

Identical prediction engine to backend/ml/predictor.py but with
standalone path resolution (looks for students.csv next to this file).

Run directly:
    python predictor.py
    python predictor.py --demo
    python predictor.py --evaluate

Feature changelog:
    - Replaced `assignment_score` (0–100) with `assignment_submitted` (0–10)
    - Updated performance_score formula: attendance(40%) + test_score(40%) + assignment_submitted(20%)
    - Removed study_hours from ML features; 3 core features: attendance, test_score, assignment_submitted
    - Updated score_breakdown keys in API response
    - Improved insight thresholds for assignment_submitted (0–10 scale)
"""

from __future__ import annotations

import argparse
import json
import os
import threading
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------
_MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
_CSV_PATH   = os.path.join(_MODULE_DIR, "students.csv")

# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------
_lock:  threading.Lock  = threading.Lock()
_model: Pipeline | None = None

# ---------------------------------------------------------------------------
# Label registry
# ---------------------------------------------------------------------------
LABELS        = ["Weak", "Average", "Strong"]
_LABEL_TO_IDX = {lbl: i for i, lbl in enumerate(LABELS)}

# Features: attendance (0-100), test_score (0-100), assignment_submitted (0-10)
_FEATURE_COLS = ["attendance", "test_score", "assignment_submitted"]
_LABEL_COL    = "label"


# ---------------------------------------------------------------------------
# Score formula
# ---------------------------------------------------------------------------
# Performance Score breakdown (max = 100):
#   Attendance           * 0.40  -> max 40 pts
#   Test Score           * 0.40  -> max 40 pts
#   Assignment Submitted * 2.0   -> max 20 pts  (capped: assignment_submitted in 0-10)
# ---------------------------------------------------------------------------

def performance_score(
    attendance: float,
    test_score: float,
    assignment_submitted: float,
) -> float:
    raw = (
        attendance                       * 0.40
        + test_score                     * 0.40
        + min(assignment_submitted * 2.0, 20.0)
    )
    return round(min(100.0, max(0.0, raw)), 2)


def label_from_score(score: float) -> str:
    if score < 40:
        return "Weak"
    if score <= 75:
        return "Average"
    return "Strong"


# ---------------------------------------------------------------------------
# Data loaders
# ---------------------------------------------------------------------------

def _load_real_data() -> tuple[np.ndarray, np.ndarray] | None:
    if not os.path.isfile(_CSV_PATH):
        print(f"[ML] students.csv not found at {_CSV_PATH}")
        return None
    try:
        df = pd.read_csv(_CSV_PATH)
    except Exception as exc:
        print(f"[ML] Cannot read CSV: {exc}")
        return None

    required = _FEATURE_COLS + [_LABEL_COL]
    missing  = [c for c in required if c not in df.columns]
    if missing:
        print(f"[ML] CSV missing columns: {missing}")
        return None

    df = df[required].dropna()
    if df.empty:
        return None

    unknown = set(df[_LABEL_COL].unique()) - set(LABELS)
    if unknown:
        print(f"[ML] Unknown labels in CSV: {unknown}")
        return None

    X = df[_FEATURE_COLS].to_numpy(dtype=float)
    y = df[_LABEL_COL].map(_LABEL_TO_IDX).to_numpy(dtype=int)
    counts = {lbl: int((y == idx).sum()) for lbl, idx in _LABEL_TO_IDX.items()}
    print(
        f"[ML] Loaded {len(df)} samples | "
        f"Weak={counts['Weak']}, Average={counts['Average']}, Strong={counts['Strong']}"
    )
    return X, y


def _generate_synthetic(n: int = 2_000) -> tuple[np.ndarray, np.ndarray]:
    print("[ML] Using synthetic training data.")
    rng = np.random.default_rng(42)
    a   = rng.uniform(0,  100, n)   # attendance (0-100)
    t   = rng.uniform(0,  100, n)   # test_score (0-100)
    asub = rng.uniform(0,  10, n)   # assignment_submitted (0-10)
    X = np.column_stack([a, t, asub])
    y = np.array([
        _LABEL_TO_IDX[label_from_score(performance_score(ai, ti, asi))]
        for ai, ti, asi in X
    ], dtype=int)
    return X, y


# ---------------------------------------------------------------------------
# Pipeline builder with optional evaluation
# ---------------------------------------------------------------------------

def _build_model(evaluate: bool = False) -> Pipeline:
    result = _load_real_data()
    X, y   = result if result is not None else _generate_synthetic()

    if evaluate:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )
    else:
        X_train, y_train = X, y

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
    pipeline.fit(X_train, y_train)

    if evaluate:
        y_pred = pipeline.predict(X_test)
        acc    = accuracy_score(y_test, y_pred)
        print(f"\n[ML] Test accuracy: {acc * 100:.1f}%")
        print(classification_report(y_test, y_pred, target_names=LABELS))

    print("[ML] Model ready.")
    return pipeline


def _get_model() -> Pipeline:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                _model = _build_model()
    return _model


# ---------------------------------------------------------------------------
# Insight generator
# ---------------------------------------------------------------------------

def build_insights(
    attendance: float,
    test_score: float,
    assignment_submitted: float,
) -> tuple[list[str], list[str], list[str]]:
    strengths:   list[str] = []
    weaknesses:  list[str] = []
    suggestions: list[str] = []

    # --- Attendance (0-100) ---
    if attendance >= 90:
        strengths.append("Outstanding attendance (>=90%) — excellent commitment.")
    elif attendance >= 75:
        strengths.append("Good attendance (75-89%) — keep it consistent.")
    elif attendance >= 60:
        weaknesses.append("Below-target attendance (60-74%).")
        suggestions.append("Aim for >=75% attendance to stay on track.")
    else:
        weaknesses.append("Critical attendance deficit (<60%) — high risk of falling behind.")
        suggestions.append("Attend every possible session immediately.")

    # --- Test Score (0-100) ---
    if test_score >= 80:
        strengths.append("Excellent test scores (>=80) — strong conceptual grasp.")
    elif test_score >= 65:
        strengths.append("Above-average test performance (65-79).")
    elif test_score >= 50:
        weaknesses.append("Average test score (50-64) — needs improvement.")
        suggestions.append("Practice past papers and revise weak topics regularly.")
    else:
        weaknesses.append("Low test score (<50) — significant knowledge gaps.")
        suggestions.append("Revisit core concepts; consider seeking tutoring support.")

    # --- Assignment Submitted (0-10) ---
    if assignment_submitted >= 9:
        strengths.append(f"Excellent assignment submission ({int(assignment_submitted)}/10) — highly disciplined.")
    elif assignment_submitted >= 7:
        strengths.append(f"Good assignment submission rate ({int(assignment_submitted)}/10).")
    elif assignment_submitted >= 5:
        weaknesses.append(f"Moderate assignment submissions ({int(assignment_submitted)}/10) — room to improve.")
        suggestions.append("Submit all remaining assignments; aim for >=8/10.")
    elif assignment_submitted >= 3:
        weaknesses.append(f"Low assignment submissions ({int(assignment_submitted)}/10) — impacting overall score.")
        suggestions.append("Prioritise assignments; create a submission schedule with deadlines.")
    else:
        weaknesses.append(f"Very few assignments submitted ({int(assignment_submitted)}/10) — critical gap.")
        suggestions.append("Submit assignments immediately; this severely affects your overall performance.")

    # --- Cross-feature insight ---
    if attendance >= 75 and test_score >= 65 and assignment_submitted >= 7:
        suggestions.append("Performing well across all areas — maintain consistency!")
    elif attendance < 60 and test_score < 50 and assignment_submitted < 5:
        suggestions.append("All three core areas need urgent attention — consider speaking with an advisor.")

    if not suggestions:
        suggestions.append("Outstanding across all areas — keep up the excellent work!")

    return strengths, weaknesses, suggestions


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def predict_single(
    attendance: float,
    test_score: float,
    assignment_submitted: float,
) -> dict[str, Any]:
    model = _get_model()
    X     = np.array([[attendance, test_score, assignment_submitted]], dtype=float)
    proba = model.predict_proba(X)[0]
    idx   = int(model.predict(X)[0])
    label = LABELS[idx]

    strengths, weaknesses, suggestions = build_insights(
        attendance, test_score, assignment_submitted
    )

    perf_score = performance_score(attendance, test_score, assignment_submitted)

    return {
        "prediction_result": label,
        "confidence":        round(float(proba[idx]) * 100, 1),
        "risk_percentage":   round(float(proba[0]) * 100, 1),
        "performance_score": perf_score,
        "score_breakdown": {
            "attendance_contribution":           round(attendance * 0.40, 2),
            "test_score_contribution":           round(test_score * 0.40, 2),
            "assignment_submitted_contribution": round(min(assignment_submitted * 2.0, 20.0), 2),
        },
        "strengths":   strengths,
        "weaknesses":  weaknesses,
        "suggestions": suggestions,
        "probabilities": {
            lbl: round(float(proba[i]) * 100, 1) for i, lbl in enumerate(LABELS)
        },
    }


def predict_bulk(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not records:
        return []
    model = _get_model()
    X = np.array(
        [[float(r.get(k, 0)) for k in _FEATURE_COLS] for r in records],
        dtype=float,
    )
    probas  = model.predict_proba(X)
    indices = model.predict(X)

    results = []
    for i, record in enumerate(records):
        a   = float(record.get("attendance",           0))
        t   = float(record.get("test_score",           0))
        asub = float(record.get("assignment_submitted", 0))
        idx   = int(indices[i])
        label = LABELS[idx]
        proba = probas[i]
        st, wk, sg = build_insights(a, t, asub)
        results.append({
            **record,
            "prediction_result": label,
            "confidence":        round(float(proba[idx]) * 100, 1),
            "risk_percentage":   round(float(proba[0]) * 100, 1),
            "performance_score": performance_score(a, t, asub),
            "score_breakdown": {
                "attendance_contribution":           round(a * 0.40, 2),
                "test_score_contribution":           round(t * 0.40, 2),
                "assignment_submitted_contribution": round(min(asub * 2.0, 20.0), 2),
            },
            "strengths":   st,
            "weaknesses":  wk,
            "suggestions": sg,
            "probabilities": {
                lbl: round(float(proba[j]) * 100, 1) for j, lbl in enumerate(LABELS)
            },
        })
    return results


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------

def _run_demo():
    samples = [
        {"name": "Alice",   "attendance": 92, "test_score": 85, "assignment_submitted": 9},
        {"name": "Bob",     "attendance": 68, "test_score": 55, "assignment_submitted": 6},
        {"name": "Charlie", "attendance": 40, "test_score": 30, "assignment_submitted": 2},
        {"name": "Diana",   "attendance": 78, "test_score": 70, "assignment_submitted": 8},
    ]
    print("\n" + "=" * 60)
    print("  EduTrack ML — Prediction Demo")
    print("=" * 60)
    for s in samples:
        result = predict_single(
            s["attendance"], s["test_score"], s["assignment_submitted"]
        )
        print(f"\n{s['name']}:")
        print(f"  Score:      {result['performance_score']}")
        print(f"  Category:   {result['prediction_result']}  "
              f"(confidence {result['confidence']}%)")
        print(f"  Risk:       {result['risk_percentage']}%")
        print(f"  Probs:      {result['probabilities']}")
        print(f"  Breakdown:  {result['score_breakdown']}")
        print(f"  Strengths:  {result['strengths']}")
        print(f"  Weaknesses: {result['weaknesses']}")
        print(f"  Tips:       {result['suggestions']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EduTrack ML Predictor")
    parser.add_argument("--demo",     action="store_true", help="Run demo predictions")
    parser.add_argument("--evaluate", action="store_true", help="Show model accuracy on 20%% holdout")
    args = parser.parse_args()

    if args.evaluate:
        _build_model(evaluate=True)
    if args.demo or not args.evaluate:
        _run_demo()
