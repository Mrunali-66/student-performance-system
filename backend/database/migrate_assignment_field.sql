-- ============================================================
-- MIGRATION: assignment_score → assignment_submitted
-- Run this ONCE on existing databases before deploying update
-- ============================================================

-- Step 1: Add new column
ALTER TABLE student_performance
  ADD COLUMN IF NOT EXISTS assignment_submitted FLOAT NOT NULL DEFAULT 0;

-- Step 2: Migrate data (scale 0-100 → 0-10)
UPDATE student_performance
  SET assignment_submitted = ROUND((assignment_score / 10.0)::numeric, 1)
  WHERE assignment_score IS NOT NULL;

-- Step 3: Drop old column (optional — keep for rollback safety)
-- ALTER TABLE student_performance DROP COLUMN assignment_score;

-- Step 4: Verify
SELECT id, username, assignment_score, assignment_submitted FROM student_performance LIMIT 5;
