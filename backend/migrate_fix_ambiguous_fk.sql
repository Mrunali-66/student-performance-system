-- =============================================================================
-- Migration: Fix AmbiguousForeignKeysError
-- =============================================================================
-- Drops the second FK constraint on student_performance.username → users.username
-- so that SQLAlchemy's User.performance relationship is unambiguous.
--
-- Run this against your existing database if you already have data you want
-- to keep.  If the DB is empty / can be recreated, just drop and restart.
--
-- Usage:
--   psql -U postgres -d student_progress -f migrate_fix_ambiguous_fk.sql
-- =============================================================================

BEGIN;

-- 1. Find and drop the FK constraint on the username column.
--    The constraint name may vary; this DO block handles both cases.
DO $$
DECLARE
    _cname TEXT;
BEGIN
    SELECT constraint_name
      INTO _cname
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = rc.constraint_name
     WHERE kcu.table_name   = 'student_performance'
       AND kcu.column_name  = 'username'
     LIMIT 1;

    IF _cname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE student_performance DROP CONSTRAINT %I', _cname);
        RAISE NOTICE 'Dropped FK constraint: %', _cname;
    ELSE
        RAISE NOTICE 'No FK on student_performance.username found — already clean.';
    END IF;
END;
$$;

-- 2. Verify only one FK remains on the table (student_id → users.id)
SELECT
    kcu.column_name,
    ccu.table_name  AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints       tc
JOIN information_schema.key_column_usage        kcu ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name      = 'student_performance';

COMMIT;
