# ml/scorer.py
# ─── Core scoring logic (pure functions, no DB dependency) ────────────────────

def calculate_performance(attendance, study_hours, prev_score, assignments_completed):
    """
    Weighted performance score (0–100):
      attendance            30%
      study_hours (cap 20h) 20%
      prev_score            35%
      assignments (cap 10)  15%
    """
    att_score    = min(float(attendance), 100) * 0.30
    study_score  = min(float(study_hours) / 20.0, 1.0) * 100 * 0.20
    prev_score_  = min(float(prev_score), 100) * 0.35
    assign_score = min(float(assignments_completed) / 10.0, 1.0) * 100 * 0.15
    return round(att_score + study_score + prev_score_ + assign_score, 2)


def categorize(score):
    """Map a numeric score to a category label."""
    if score >= 75:
        return 'Top Performer'
    elif score >= 40:
        return 'Average'
    else:
        return 'Weak'


def enrich(student: dict) -> dict:
    """Return a copy of the student dict with performance_score and category added."""
    score = calculate_performance(
        student.get('attendance', 0),
        student.get('study_hours', 0),
        student.get('prev_score', 0),
        student.get('assignments_completed', 0),
    )
    return {**student, 'performance_score': score, 'category': categorize(score)}
