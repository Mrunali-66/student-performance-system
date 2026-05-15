def calculate_performance(attendance, study_hours, prev_score, assignments_completed):
    score = (
        attendance * 0.30 +
        min(study_hours / 10, 1) * 100 * 0.25 +
        prev_score * 0.30 +
        min(assignments_completed / 10, 1) * 100 * 0.15
    )
    return round(score, 2)

def categorize(score):
    if score < 40:
        return 'Weak'
    elif score <= 75:
        return 'Average'
    else:
        return 'Top Performer'

def enrich(student):
    score = calculate_performance(
        student.get('attendance', 0),
        student.get('study_hours', 0),
        student.get('prev_score', 0),
        student.get('assignments_completed', 0)
    )
    student['performance_score'] = score
    student['category'] = categorize(score)
    return student
