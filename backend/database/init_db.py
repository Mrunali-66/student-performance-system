# database/init_db.py — Create PostgreSQL tables (safe, idempotent)
#
# FIX: Removed DROP TABLE statements that were wiping all data on every
# server restart. CREATE TABLE IF NOT EXISTS already handles first-run
# correctly. Use Alembic for schema migrations going forward.
#
# FIX: Removed username FK from student_performance — username is now a
# plain denormalised cache column. The only FK is student_id → users.id.
# This eliminates the AmbiguousForeignKeysError from SQLAlchemy.

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# ─── Create statements ────────────────────────────────────────────────────────

CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(80)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(10)  NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'teacher')),
    branch      VARCHAR(50)  NOT NULL
                    CHECK (branch IN (
                        'Data Science',
                        'Python Development',
                        'Java Development',
                        'AI & Machine Learning'
                    )),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_role     ON users (role);
CREATE INDEX IF NOT EXISTS idx_branch   ON users (branch);
"""

# username is a plain VARCHAR cache column — no FK constraint.
# Removing the FK eliminates the AmbiguousForeignKeysError and the
# risky ON UPDATE CASCADE that was chained to users.username.
CREATE_STUDENT_PERFORMANCE_TABLE = """
CREATE TABLE IF NOT EXISTS student_performance (
    id                SERIAL PRIMARY KEY,
    student_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username          VARCHAR(80)  NOT NULL,
    attendance        FLOAT        NOT NULL DEFAULT 0,
    study_hours       FLOAT        NOT NULL DEFAULT 0,
    test_score        FLOAT        NOT NULL DEFAULT 0,
    assignment_score  FLOAT        NOT NULL DEFAULT 0,
    prediction_result VARCHAR(20)  NOT NULL DEFAULT 'Unanalyzed',
    risk_percentage   FLOAT        NOT NULL DEFAULT 0,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sp_student_id        ON student_performance (student_id);
CREATE INDEX IF NOT EXISTS idx_sp_username          ON student_performance (username);
CREATE INDEX IF NOT EXISTS idx_sp_prediction_result ON student_performance (prediction_result);
"""

CREATE_TOKEN_BLOCKLIST_TABLE = """
CREATE TABLE IF NOT EXISTS token_blocklist (
    id          SERIAL PRIMARY KEY,
    jti         VARCHAR(36) NOT NULL UNIQUE,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_jti ON token_blocklist (jti);
"""

# ─── Migration helper ─────────────────────────────────────────────────────────
# If you upgraded from the old schema (which had a username FK), run this once
# to drop that constraint. Safe to run on an already-clean DB.
DROP_OLD_USERNAME_FK = """
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM   pg_constraint
        WHERE  conrelid = 'student_performance'::regclass
        AND    contype  = 'f'
        AND    conname  LIKE '%username%'
    LOOP
        EXECUTE 'ALTER TABLE student_performance DROP CONSTRAINT ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped FK constraint: %', r.conname;
    END LOOP;
END $$;
"""


def init_database():
    """
    Idempotent schema initialisation — safe to call on every startup.
    Tables are created only if they don't already exist; no data is lost.
    """
    host     = os.getenv("DB_HOST", "localhost")
    port     = int(os.getenv("DB_PORT", 5432))
    user     = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "Jiya@664")
    db_name  = os.getenv("DB_NAME", "student_progress")

    conn = psycopg2.connect(
        host=host, port=port, user=user, password=password, dbname=db_name
    )
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            # Drop the old username FK if it still exists (one-time migration)
            cur.execute(DROP_OLD_USERNAME_FK)

            # Create tables (IF NOT EXISTS — safe on repeat runs)
            cur.execute(CREATE_USERS_TABLE)
            cur.execute(CREATE_STUDENT_PERFORMANCE_TABLE)
            cur.execute(CREATE_TOKEN_BLOCKLIST_TABLE)

        print(f"[DB] Schema verified / initialised in '{db_name}'.")
    finally:
        conn.close()
