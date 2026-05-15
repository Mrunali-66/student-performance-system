import psycopg2
import psycopg2.extras
import os

# =========================
# DATABASE CONFIG
# =========================
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'dbname': 'student_progress',
    'user': 'postgres',
    'password': 'Jiya@664',
}

# =========================
# CREATE TABLE: STUDENTS
# =========================
CREATE_STUDENTS_TABLE = """
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    batch VARCHAR(50),
    attendance FLOAT NOT NULL,
    study_hours FLOAT NOT NULL,
    prev_score FLOAT NOT NULL,
    assignments_completed FLOAT NOT NULL,
    performance_score FLOAT DEFAULT 0,
    category VARCHAR(20) DEFAULT 'Unanalyzed'
);
"""

# =========================
# CREATE TABLE: USERS
# =========================
CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'teacher')),
    created_at TIMESTAMP DEFAULT NOW()
);
"""

# =========================
# CREATE TABLE: STUDENT PERFORMANCE
# =========================
CREATE_STUDENT_PERFORMANCE_TABLE = """
CREATE TABLE IF NOT EXISTS student_performance (
    id SERIAL PRIMARY KEY,

    student_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    attendance FLOAT NOT NULL DEFAULT 0,
    study_hours FLOAT NOT NULL DEFAULT 0,
    assignment_score FLOAT NOT NULL DEFAULT 0,
    internal_marks FLOAT NOT NULL DEFAULT 0,

    predicted_performance FLOAT DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'Unanalyzed',

    analysis_report TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    recommendations TEXT DEFAULT '',

    updated_by_teacher BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT NOW()
);
"""

# =========================
# DATABASE CONNECTION
# =========================
def get_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("[DB] Connected successfully.")
        return conn

    except Exception as e:
        print(f"[DB] Connection Error: {e}")
        raise


# =========================
# INITIALIZE DATABASE
# =========================
def init_db():
    try:
        conn = get_connection()

        with conn.cursor() as cur:
            cur.execute(CREATE_STUDENTS_TABLE)
            print("[DB] students table created.")

            cur.execute(CREATE_USERS_TABLE)
            print("[DB] users table created.")

            cur.execute(CREATE_STUDENT_PERFORMANCE_TABLE)
            print("[DB] student_performance table created.")

        conn.commit()
        conn.close()

        print("[DB] All tables initialized successfully.")

    except Exception as e:
        print(f"[DB] Init Error: {e}")
        raise


# =========================
# MAIN
# =========================
if __name__ == "__main__":
    init_db()