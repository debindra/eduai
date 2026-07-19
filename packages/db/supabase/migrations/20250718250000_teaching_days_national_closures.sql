-- Phase 7 / P7-DB-04: extend teaching_days VIEW to exclude published national closures.
-- Remains a VIEW recomputed on read — never a stored count (invariant #6).
-- Backward compatible: when no national calendar is published, behaviour unchanged.

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
  'Derived teaching days per terminal (span − weekly_offs − school closures − '
  'published national closures). Never materialize as a cached count column.';
