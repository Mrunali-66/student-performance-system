import psycopg2
import psycopg2.extras
import os

DB_CONFIG = {
    'host':     os.getenv('DB_HOST',     'localhost'),
    'port':     int(os.getenv('DB_PORT', 5432)),
    'dbname':   os.getenv('DB_NAME',     'student_progress'),
    'user':     os.getenv('DB_USER',     'postgres'),
    'password': os.getenv('DB_PASSWORD', 'Jiya@664'),
}

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS students (
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(100) NOT NULL,
    batch                 VARCHAR(50),
    attendance            FLOAT NOT NULL,
    study_hours           FLOAT NOT NULL,
    prev_score            FLOAT NOT NULL,
    assignments_completed FLOAT NOT NULL,
    performance_score     FLOAT DEFAULT 0,
    category              VARCHAR(20) DEFAULT 'Unanalyzed'
);
"""

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def init_db():
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
        conn.commit()
        conn.close()
        print("[DB] students table ready.")
    except Exception as e:
        print(f"[DB] Init error: {e}")
        raise
