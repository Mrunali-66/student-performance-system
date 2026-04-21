"""
ML Analysis — EduTrack Student Progress System
Fields: attendance, study_hours, prev_score, assignments_completed
Performance formula:
  score = attendance*0.30 + min(study_hours*1.5,25) + prev_score*0.30 + min(assignments*2,15)
Categories: < 40 Weak | 40-75 Average | > 75 Top Performer
"""
import pandas as pd
import os

BASE_DIR    = os.path.join(os.path.dirname(__file__), '..', 'dataset')
INPUT_CSV   = os.path.join(BASE_DIR, 'students.csv')
WEAK_CSV    = os.path.join(BASE_DIR, 'weak_students.csv')
AVERAGE_CSV = os.path.join(BASE_DIR, 'average_students.csv')
TOP_CSV     = os.path.join(BASE_DIR, 'top_students.csv')

def calculate_performance(row):
    att   = float(row.get('attendance', 0))
    study = float(row.get('study_hours', 0))
    prev  = float(row.get('prev_score', 0))
    asgn  = float(row.get('assignments_completed', 0))
    score = att * 0.30 + min(study * 1.5, 25) + prev * 0.30 + min(asgn * 2, 15)
    return round(min(100, max(0, score)), 2)

def categorize(score):
    if score < 40:   return 'Weak'
    elif score <= 75: return 'Average'
    else:             return 'Top Performer'

def get_individual_analysis(student):
    """Return detailed analysis for a single student dict."""
    score = calculate_performance(student)
    cat   = categorize(score)
    att   = float(student.get('attendance', 0))
    study = float(student.get('study_hours', 0))
    prev  = float(student.get('prev_score', 0))
    asgn  = float(student.get('assignments_completed', 0))

    strengths  = []
    weaknesses = []
    suggestions = []

    if att >= 80:   strengths.append('Excellent attendance')
    elif att >= 60: strengths.append('Decent attendance')
    else:           weaknesses.append('Poor attendance'); suggestions.append('Improve attendance to at least 75%')

    if study >= 15:  strengths.append('Strong study hours')
    elif study >= 8: strengths.append('Moderate study time')
    else:            weaknesses.append('Low study hours'); suggestions.append('Increase weekly study hours to 15+')

    if prev >= 70:   strengths.append('Good academic history')
    elif prev >= 50: strengths.append('Average academic history')
    else:            weaknesses.append('Low previous score'); suggestions.append('Focus on fundamentals and revision')

    if asgn >= 8:   strengths.append('Consistent assignment submission')
    elif asgn >= 5: strengths.append('Moderate assignment completion')
    else:           weaknesses.append('Missing assignments'); suggestions.append('Complete all assignments on time')

    if not suggestions:
        suggestions.append('Keep up the excellent work!')

    return {
        'performance_score': score,
        'category':          cat,
        'strengths':         strengths,
        'weaknesses':        weaknesses,
        'suggestions':       suggestions,
        'score_breakdown': {
            'attendance_contribution':   round(att * 0.30, 2),
            'study_contribution':        round(min(study * 1.5, 25), 2),
            'prev_score_contribution':   round(prev * 0.30, 2),
            'assignments_contribution':  round(min(asgn * 2, 15), 2),
        }
    }

def run_analysis():
    if not os.path.exists(INPUT_CSV):
        return {'total_students':0,'weak_students_count':0,'average_students_count':0,'top_students_count':0}
    df = pd.read_csv(INPUT_CSV)
    if df.empty:
        _write_empty_csvs(); return {'total_students':0,'weak_students_count':0,'average_students_count':0,'top_students_count':0}

    df['performance_score'] = df.apply(calculate_performance, axis=1)
    df['category']          = df['performance_score'].apply(categorize)

    weak_df = df[df['category']=='Weak']
    avg_df  = df[df['category']=='Average']
    top_df  = df[df['category']=='Top Performer']

    weak_df.to_csv(WEAK_CSV,    index=False)
    avg_df.to_csv(AVERAGE_CSV,  index=False)
    top_df.to_csv(TOP_CSV,      index=False)
    df.to_csv(INPUT_CSV, index=False)

    return {
        'total_students':          len(df),
        'weak_students_count':     len(weak_df),
        'average_students_count':  len(avg_df),
        'top_students_count':      len(top_df),
    }

def get_weak_students():
    if not os.path.exists(WEAK_CSV): return []
    return pd.read_csv(WEAK_CSV).to_dict(orient='records')

def get_top_students():
    if not os.path.exists(TOP_CSV): return []
    return pd.read_csv(TOP_CSV).to_dict(orient='records')

def _write_empty_csvs():
    headers = ['id','name','batch','attendance','study_hours','prev_score',
               'assignments_completed','performance_score','category']
    empty = pd.DataFrame(columns=headers)
    for p in [WEAK_CSV, AVERAGE_CSV, TOP_CSV]:
        empty.to_csv(p, index=False)

if __name__ == '__main__':
    print(run_analysis())
