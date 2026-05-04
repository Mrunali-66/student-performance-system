# ml/db_reader.py
# ─── Fetches student records from PostgreSQL ──────────────────────────────────
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import psycopg2.extras
from models.db import get_connection


def fetch_all_students() -> list:
    """Return all student rows from the DB as a list of plain dicts."""
    try:
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM students ORDER BY id")
            rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        print(f"[ml.db_reader] DB fetch error: {e}")
        return []
