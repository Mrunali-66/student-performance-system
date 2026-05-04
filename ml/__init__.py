# ml/__init__.py  — re-export everything routes need
from ml.scorer   import calculate_performance, categorize, enrich
from ml.analysis import run_analysis, get_weak_students, get_top_students, get_individual_analysis
from ml.db_reader import fetch_all_students

__all__ = [
    'calculate_performance', 'categorize', 'enrich',
    'run_analysis', 'get_weak_students', 'get_top_students', 'get_individual_analysis',
    'fetch_all_students',
]
