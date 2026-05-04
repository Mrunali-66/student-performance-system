# ml/analysis.py
# ─── High-level analysis functions used by Flask routes ──────────────────────
from ml.scorer import calculate_performance, categorize, enrich
from ml.db_reader import fetch_all_students


def run_analysis() -> dict:
    """Return a summary dict for the whole student body (live from DB)."""
    students = [enrich(s) for s in fetch_all_students()]

    if not students:
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

    weak = [s for s in students if s['performance_score'] < 40]
    top  = [s for s in students if s['performance_score'] >= 75]
    avg  = [s for s in students if 40 <= s['performance_score'] < 75]

    def mean(key):
        return round(sum(s.get(key, 0) for s in students) / len(students), 2)

    return {
        'total_students':         len(students),
        'weak_students_count':    len(weak),
        'top_students_count':     len(top),
        'average_students_count': len(avg),
        'avg_performance_score':  mean('performance_score'),
        'avg_attendance':         mean('attendance'),
        'avg_study_hours':        mean('study_hours'),
        'avg_prev_score':         mean('prev_score'),
        'avg_assignments':        mean('assignments_completed'),
    }


def get_weak_students() -> list:
    """Students with performance_score < 40, sorted worst-first."""
    students = [enrich(s) for s in fetch_all_students()]
    weak = [s for s in students if s['performance_score'] < 40]
    return sorted(weak, key=lambda s: s['performance_score'])


def get_top_students() -> list:
    """Students with performance_score >= 75, sorted best-first."""
    students = [enrich(s) for s in fetch_all_students()]
    top = [s for s in students if s['performance_score'] >= 75]
    return sorted(top, key=lambda s: s['performance_score'], reverse=True)


def get_individual_analysis(student: dict) -> dict:
    """Detailed breakdown, strengths, weaknesses, and suggestions for one student."""
    att   = float(student.get('attendance', 0))
    study = float(student.get('study_hours', 0))
    prev  = float(student.get('prev_score', 0))
    assgn = float(student.get('assignments_completed', 0))

    att_c   = round(min(att, 100) * 0.30, 2)
    study_c = round(min(study / 20.0, 1.0) * 100 * 0.20, 2)
    prev_c  = round(min(prev, 100) * 0.35, 2)
    assgn_c = round(min(assgn / 10.0, 1.0) * 100 * 0.15, 2)
    score   = round(att_c + study_c + prev_c + assgn_c, 2)
    cat     = categorize(score)

    strengths = []
    if att >= 85:     strengths.append(f'Excellent attendance ({att}%)')
    elif att >= 70:   strengths.append(f'Good attendance ({att}%)')
    if study >= 15:   strengths.append(f'High study hours ({study}h/week)')
    elif study >= 10: strengths.append(f'Adequate study hours ({study}h/week)')
    if prev >= 75:    strengths.append(f'Strong previous score ({prev})')
    elif prev >= 60:  strengths.append(f'Decent previous score ({prev})')
    if assgn >= 8:    strengths.append(f'Consistent assignment completion ({int(assgn)})')

    weaknesses = []
    if att < 60:    weaknesses.append(f'Very low attendance ({att}%) — below 60%')
    elif att < 75:  weaknesses.append(f'Low attendance ({att}%) — needs improvement')
    if study < 5:   weaknesses.append(f'Insufficient study hours ({study}h/week)')
    elif study < 8: weaknesses.append(f'Below-average study hours ({study}h/week)')
    if prev < 40:   weaknesses.append(f'Poor previous score ({prev})')
    elif prev < 55: weaknesses.append(f'Below-average previous score ({prev})')
    if assgn < 4:   weaknesses.append(f'Low assignment completion ({int(assgn)})')
    elif assgn < 6: weaknesses.append(f'Moderate assignment completion ({int(assgn)})')

    suggestions = []
    if att < 75:   suggestions.append('Prioritise attending all classes — target >= 85% attendance.')
    if study < 10: suggestions.append('Increase daily study time — aim for at least 10–12 hrs/week.')
    if prev < 55:  suggestions.append('Revisit fundamentals from the previous term to close knowledge gaps.')
    if assgn < 6:  suggestions.append('Complete all assignments on time to build consistent habits.')
    if score < 40: suggestions.append('Consider enrolling in remedial sessions or peer tutoring.')
    if not suggestions:
        suggestions.append('Keep up the great work and maintain current performance levels.')

    return {
        'performance_score': score,
        'category': cat,
        'score_breakdown': {
            'attendance_contribution':  att_c,
            'study_contribution':       study_c,
            'prev_score_contribution':  prev_c,
            'assignments_contribution': assgn_c,
        },
        'strengths':   strengths  or ['No particular strengths identified yet'],
        'weaknesses':  weaknesses or ['No critical weaknesses detected'],
        'suggestions': suggestions,
    }
