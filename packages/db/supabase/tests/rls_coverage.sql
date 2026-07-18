-- RLS coverage checklist for tables with child_id / section_id / teacher_id.
-- CI runs this against local Supabase after migrate; fails if expected policies missing.
-- Deliberately-broken fixture: see scripts/ci/check-rls-coverage.mjs

SELECT
  c.relname AS table_name,
  COUNT(p.polname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'student_outcomes',
    'attendance_record',
    'teacher_sections',
    'children',
    'sections',
    'lesson_progress',
    'yearly_map',
    'map_slices',
    'map_slice_outcomes',
    'prompts',
    'parent_report_drafts',
    'coach_messages'
  )
GROUP BY c.relname
ORDER BY c.relname;

-- Each listed table must have at least one policy (audit_log intentionally has zero for authenticated).
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t.table_name, ', ')
  INTO missing
  FROM (
    SELECT unnest(ARRAY[
      'student_outcomes',
      'attendance_record',
      'teacher_sections',
      'children',
      'sections',
      'lesson_progress',
      'yearly_map',
      'map_slices',
      'map_slice_outcomes',
      'prompts',
      'parent_report_drafts',
      'coach_messages'
    ]) AS table_name
  ) t
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t.table_name
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS coverage gap — no policies on: %', missing;
  END IF;
END $$;
