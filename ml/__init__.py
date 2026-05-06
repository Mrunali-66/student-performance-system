# ml/__init__.py
from ml.scorer import calculate_performance, categorize, enrich
from ml.analyze_students import (
    run_analysis, get_weak_students,
    get_top_students, get_individual_analysis,
)

__all__ = [
    'calculate_performance', 'categorize', 'enrich',
    'run_analysis', 'get_weak_students', 'get_top_students', 'get_individual_analysis',
]
