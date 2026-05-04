import os
import sys
import pandas as pd

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

CSV_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'dataset', 'students.csv')


# ─── Scoring helpers ──────────────────────────────────────────────────────────

def calculate_performance(attendance, study_hours, prev_score, assignments_completed):
    """
    Weighted performance score (0–100):
      attendance            30 %
      study_hours (cap 20h) 20 %
      prev_score            35 %
      assignments (cap 10)  15 %
    """
    att_score   = min(attendance, 100) * 0.30
    study_score = min(study_hours / 20.0, 1.0) * 100 * 0.20
    prev_score_ = min(prev_score, 100) * 0.35
    assign_score = min(assignments_completed / 10.0, 1.0) * 100 * 0.15
    return round(att_score + study_score + prev_score_ + assign_score, 2)


def categorize(score):
    if score >= 75:
        return 'Top Performer'
    elif score >= 40:
        return 'Average'
    else:
        return 'Weak'


# ─── CSV-based analysis ───────────────────────────────────────────────────────

def _load_df():
    """Load students CSV; return empty DataFrame if missing."""
    if os.path.exists(CSV_PATH):
        return pd.read_csv(CSV_PATH)
    return pd.DataFrame(columns=[
        'id', 'name', 'batch', 'attendance', 'study_hours',
        'prev_score', 'assignments_completed', 'performance_score', 'category'
    ])


def _ensure_scores(df):
    """Add/recalculate performance_score and category if absent."""
    if df.empty:
        return df
    df = df.copy()
    df['performance_score'] = df.apply(
        lambda r: calculate_performance(
            r.get('attendance', 0), r.get('study_hours', 0),
            r.get('prev_score', 0), r.get('assignments_completed', 0)
        ), axis=1
    )
    df['category'] = df['performance_score'].apply(categorize)
    return df


def run_analysis():
    """Return a summary dict for the whole student body."""
    df = _load_df()
    if df.empty:
        return {
            'total_students': 0,
            'weak_students_count': 0,
            'top_students_count': 0,
            'average_students_count': 0,
            'avg_performance_score': 0,
            'avg_attendance': 0,
            'avg_study_hours': 0,
            'avg_prev_score': 0,
            'avg_assignments': 0,
        }

    df = _ensure_scores(df)

    weak  = df[df['performance_score'] < 40]
    top   = df[df['performance_score'] >= 75]
    avg   = df[(df['performance_score'] >= 40) & (df['performance_score'] < 75)]

    return {
        'total_students':        int(len(df)),
        'weak_students_count':   int(len(weak)),
        'top_students_count':    int(len(top)),
        'average_students_count': int(len(avg)),
        'avg_performance_score': round(float(df['performance_score'].mean()), 2),
        'avg_attendance':        round(float(df['attendance'].mean()), 2),
        'avg_study_hours':       round(float(df['study_hours'].mean()), 2),
        'avg_prev_score':        round(float(df['prev_score'].mean()), 2),
        'avg_assignments':       round(float(df['assignments_completed'].mean()), 2),
    }


def get_weak_students():
    """Return list of students with performance_score < 40."""
    df = _load_df()
    if df.empty:
        return []
    df = _ensure_scores(df)
    weak = df[df['performance_score'] < 40].copy()
    weak = weak.sort_values('performance_score')
    return weak.to_dict(orient='records')


def get_top_students():
    """Return list of students with performance_score >= 75."""
    df = _load_df()
    if df.empty:
        return []
    df = _ensure_scores(df)
    top = df[df['performance_score'] >= 75].copy()
    top = top.sort_values('performance_score', ascending=False)
    return top.to_dict(orient='records')


# ─── Individual analysis ──────────────────────────────────────────────────────

def get_individual_analysis(student: dict) -> dict:
    """
    Given a student dict, return detailed analysis with:
      - performance_score, category
      - score_breakdown  (contribution of each factor)
      - strengths, weaknesses, suggestions
    """
    att   = float(student.get('attendance', 0))
    study = float(student.get('study_hours', 0))
    prev  = float(student.get('prev_score', 0))
    assgn = float(student.get('assignments_completed', 0))

    # Contributions
    att_c   = round(min(att, 100) * 0.30, 2)
    study_c = round(min(study / 20.0, 1.0) * 100 * 0.20, 2)
    prev_c  = round(min(prev, 100) * 0.35, 2)
    assgn_c = round(min(assgn / 10.0, 1.0) * 100 * 0.15, 2)

    score = round(att_c + study_c + prev_c + assgn_c, 2)
    cat   = categorize(score)

    # Strengths
    strengths = []
    if att >= 85:
        strengths.append(f'Excellent attendance ({att}%)')
    elif att >= 70:
        strengths.append(f'Good attendance ({att}%)')
    if study >= 15:
        strengths.append(f'High study hours ({study}h/week)')
    elif study >= 10:
        strengths.append(f'Adequate study hours ({study}h/week)')
    if prev >= 75:
        strengths.append(f'Strong previous score ({prev})')
    elif prev >= 60:
        strengths.append(f'Decent previous score ({prev})')
    if assgn >= 8:
        strengths.append(f'Consistent assignment completion ({int(assgn)}/10+)')

    # Weaknesses
    weaknesses = []
    if att < 60:
        weaknesses.append(f'Very low attendance ({att}%) — below 60%')
    elif att < 75:
        weaknesses.append(f'Low attendance ({att}%) — needs improvement')
    if study < 5:
        weaknesses.append(f'Insufficient study hours ({study}h/week)')
    elif study < 8:
        weaknesses.append(f'Below-average study hours ({study}h/week)')
    if prev < 40:
        weaknesses.append(f'Poor previous score ({prev}) — significant gap')
    elif prev < 55:
        weaknesses.append(f'Below-average previous score ({prev})')
    if assgn < 4:
        weaknesses.append(f'Low assignment completion ({int(assgn)})')
    elif assgn < 6:
        weaknesses.append(f'Moderate assignment completion ({int(assgn)})')

    # Suggestions
    suggestions = []
    if att < 75:
        suggestions.append('Prioritise attending all classes; target ≥ 85% attendance.')
    if study < 10:
        suggestions.append('Increase daily study time — aim for at least 10–12 hrs/week.')
    if prev < 55:
        suggestions.append('Revisit fundamentals from previous term to close knowledge gaps.')
    if assgn < 6:
        suggestions.append('Complete all assignments on time to build consistent habits.')
    if score < 40:
        suggestions.append('Consider enrolling in remedial sessions or peer tutoring.')
    if not suggestions:
        suggestions.append('Keep up the great work and maintain current performance levels.')

    return {
        'performance_score': score,
        'category': cat,
        'score_breakdown': {
            'attendance_contribution':   att_c,
            'study_contribution':        study_c,
            'prev_score_contribution':   prev_c,
            'assignments_contribution':  assgn_c,
        },
        'strengths':   strengths  if strengths  else ['No particular strengths identified yet'],
        'weaknesses':  weaknesses if weaknesses else ['No critical weaknesses detected'],
        'suggestions': suggestions,
    }
