"""
ml/analyze_students.py  —  EduTrack Dataset Analysis Engine (standalone)

Reads students.csv from the same directory, runs predictions via predictor.py,
and writes categorised CSVs (weak / average / top).

Usage:
    python analyze_students.py                   # full analysis
    python analyze_students.py --student 3       # individual by CSV row index
    python analyze_students.py --export          # regenerate category CSVs

Feature changelog:
    - Replaced assignment_score with assignment_submitted (0-10)
    - Removed study_hours from required feature set
    - Updated get_individual_analysis to use new field names
    - Updated _DEFAULTS and _REQUIRED_FEATURES accordingly
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

import pandas as pd

from predictor import (
    predict_single,
    predict_bulk,
    performance_score,
    label_from_score,
    LABELS,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_DIR        = Path(__file__).resolve().parent
INPUT_CSV   = _DIR / "students.csv"
WEAK_CSV    = _DIR / "weak_students.csv"
AVERAGE_CSV = _DIR / "average_students.csv"
TOP_CSV     = _DIR / "top_students.csv"

_REQUIRED_FEATURES = ["attendance", "test_score", "assignment_submitted"]

_DEFAULTS: dict[str, Any] = {
    "attendance":           0.0,
    "test_score":           0.0,
    "assignment_submitted": 0.0,
    "name":                 "Unknown",
    "batch":                "Unknown",
}


# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------

def _load() -> pd.DataFrame | None:
    if not INPUT_CSV.exists():
        print(f"[analyze] students.csv not found at {INPUT_CSV}")
        return None
    df = pd.read_csv(INPUT_CSV)
    for col, default in _DEFAULTS.items():
        if col not in df.columns:
            df[col] = default
    return df


def _apply_predictions(df: pd.DataFrame) -> pd.DataFrame:
    """Run bulk prediction and merge results back into the DataFrame."""
    records = df.to_dict(orient="records")
    results = predict_bulk(records)
    results_df = pd.DataFrame(results)

    # Merge prediction columns back
    for col in [
        "prediction_result", "confidence", "risk_percentage",
        "performance_score", "probabilities", "score_breakdown",
        "strengths", "weaknesses", "suggestions",
    ]:
        if col in results_df.columns:
            df[col] = results_df[col].values

    # Human-readable category column
    df["category"] = df["prediction_result"]
    return df


def _export_category_csvs(df: pd.DataFrame):
    """Write filtered CSVs for each performance category."""
    _DIR.mkdir(parents=True, exist_ok=True)
    df[df["category"] == "Weak"].to_csv(WEAK_CSV,    index=False)
    df[df["category"] == "Average"].to_csv(AVERAGE_CSV, index=False)
    df[df["category"] == "Strong"].to_csv(TOP_CSV,    index=False)
    print(f"[analyze] Category CSVs written to {_DIR}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_analysis() -> dict:
    """
    Full analysis: load CSV, predict, export category CSVs.
    Returns summary statistics dict.
    """
    df = _load()
    if df is None or df.empty:
        return {"total": 0, "weak": 0, "average": 0, "strong": 0}

    df = _apply_predictions(df)
    _export_category_csvs(df)

    # Persist enriched CSV
    df.to_csv(INPUT_CSV, index=False)

    counts = df["category"].value_counts().to_dict()
    return {
        "total":   len(df),
        "weak":    counts.get("Weak",    0),
        "average": counts.get("Average", 0),
        "strong":  counts.get("Strong",  0),
    }


def get_individual_analysis(student: dict) -> dict:
    """
    Analyse a single student dict.
    Keys expected: attendance, test_score, assignment_submitted
    """
    a    = float(student.get("attendance",           0))
    t    = float(student.get("test_score",           0))
    asub = float(student.get("assignment_submitted", 0))
    return predict_single(a, t, asub)


def get_all_students() -> list[dict]:
    df = _load()
    if df is None or df.empty:
        return []
    if "prediction_result" not in df.columns:
        df = _apply_predictions(df)
    return df.to_dict(orient="records")


def get_risk_summary() -> dict:
    df = _load()
    if df is None or df.empty:
        return {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "total": 0}
    if "performance_score" not in df.columns:
        df = _apply_predictions(df)

    def risk(score):
        if score < 40:
            return "HIGH"
        if score <= 75:
            return "MEDIUM"
        return "LOW"

    df["risk_level"] = df["performance_score"].apply(risk)
    counts = df["risk_level"].value_counts().to_dict()
    return {
        "HIGH":   counts.get("HIGH",   0),
        "MEDIUM": counts.get("MEDIUM", 0),
        "LOW":    counts.get("LOW",    0),
        "total":  len(df),
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EduTrack Dataset Analyzer")
    parser.add_argument("--export",   action="store_true", help="Export category CSVs")
    parser.add_argument("--student",  type=int, default=None,
                        help="Row index (0-based) for individual analysis")
    parser.add_argument("--summary",  action="store_true", help="Print risk summary")
    args = parser.parse_args()

    if args.student is not None:
        df = _load()
        if df is not None and args.student < len(df):
            row    = df.iloc[args.student].to_dict()
            result = get_individual_analysis(row)
            print(f"\nStudent row {args.student}:")
            print(json.dumps(result, indent=2, default=str))
        else:
            print("[analyze] Row index out of range.")
    elif args.summary:
        print(json.dumps(get_risk_summary(), indent=2))
    else:
        summary = run_analysis()
        print("\n[analyze] Analysis complete:")
        print(json.dumps(summary, indent=2))
        if args.export:
            print("[analyze] Category CSVs exported.")
