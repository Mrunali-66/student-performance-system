import csv, os

DATASET_DIR  = os.path.join(os.path.dirname(__file__), '..', '..', 'dataset')
STUDENTS_CSV = os.path.join(DATASET_DIR, 'students.csv')

CSV_HEADERS = ['id','name','batch','attendance','study_hours','prev_score',
               'assignments_completed','performance_score','category']

def ensure_csv_exists():
    os.makedirs(DATASET_DIR, exist_ok=True)
    if not os.path.exists(STUDENTS_CSV):
        with open(STUDENTS_CSV, 'w', newline='') as f:
            csv.DictWriter(f, fieldnames=CSV_HEADERS).writeheader()

def sync_csv_from_db(students: list):
    ensure_csv_exists()
    with open(STUDENTS_CSV, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=CSV_HEADERS, extrasaction='ignore')
        w.writeheader(); w.writerows(students)
