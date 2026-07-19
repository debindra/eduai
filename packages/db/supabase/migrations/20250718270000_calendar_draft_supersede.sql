-- Calendar draft-copy publish: allow draft alongside approved for the same year.
-- On re-approve, previous approved becomes superseded. Teachers / teaching_days
-- read approved rows only.

ALTER TYPE calendar_approval_status ADD VALUE IF NOT EXISTS 'superseded';

ALTER TABLE school_calendars
  DROP CONSTRAINT IF EXISTS school_calendars_school_year_unique;

-- At most one editable draft per school.
CREATE UNIQUE INDEX IF NOT EXISTS school_calendars_one_draft_per_school
  ON school_calendars (school_id)
  WHERE approval_status = 'draft';

-- At most one live approved calendar per school + academic year.
CREATE UNIQUE INDEX IF NOT EXISTS school_calendars_one_approved_per_school_year
  ON school_calendars (school_id, academic_year_label)
  WHERE approval_status = 'approved';

COMMENT ON COLUMN school_calendars.approval_status IS
  'draft = editable working copy; approved = live for teachers/teaching_days; '
  'superseded = previous approved kept for history.';

-- teaching_days: only approved calendars (draft/superseded never affect live counts).
CREATE OR REPLACE VIEW teaching_days AS
WITH bounds AS (
  SELECT
    t.id AS terminal_id,
    t.school_calendar_id,
    sc.school_id,
    t.start_date,
    t.end_date,
    sc.weekly_offs
  FROM terminals t
  JOIN school_calendars sc ON sc.id = t.school_calendar_id
  WHERE sc.approval_status = 'approved'
),
days AS (
  SELECT
    b.terminal_id,
    b.school_calendar_id,
    b.school_id,
    d::date AS day
  FROM bounds b
  CROSS JOIN LATERAL generate_series(b.start_date, b.end_date, '1 day'::interval) AS d
  WHERE NOT (EXTRACT(ISODOW FROM d)::smallint = ANY (b.weekly_offs))
),
closed AS (
  SELECT
    d.terminal_id,
    d.school_calendar_id,
    d.school_id,
    d.day
  FROM days d
  WHERE NOT EXISTS (
    SELECT 1
    FROM calendar_closures c
    WHERE c.school_calendar_id = d.school_calendar_id
      AND c.category = 'school_holiday'
      AND d.day BETWEEN c.start_date AND c.end_date
  )
  AND NOT EXISTS (
    SELECT 1
    FROM national_closures nc
    JOIN national_calendars nat ON nat.id = nc.national_calendar_id
    WHERE nat.status = 'published'
      AND d.day BETWEEN nc.start_date AND nc.end_date
  )
)
SELECT
  terminal_id,
  school_calendar_id,
  school_id,
  day,
  ROW_NUMBER() OVER (PARTITION BY terminal_id ORDER BY day) AS day_index
FROM closed;

COMMENT ON VIEW teaching_days IS
  'Derived teaching days for approved calendars only (span − weekly_offs − '
  'school_holiday closures − published national closures). Draft/superseded '
  'calendars are excluded. Never materialize as a cached count column.';
