-- Calendar spine: dates only. Curriculum sequence meets calendar at yearly_map.
-- teaching_days is a VIEW — never a stored count.
-- terminals: coverage/reporting boundaries only — no test-date column, ever.

CREATE TYPE calendar_approval_status AS ENUM ('draft', 'approved');
CREATE TYPE terminal_reporting_type AS ENUM ('formative', 'summative', 'transition');

CREATE TABLE school_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_label text NOT NULL,
  session_start date NOT NULL,
  session_end date NOT NULL,
  weekly_offs smallint[] NOT NULL DEFAULT '{6}',
  approval_status calendar_approval_status NOT NULL DEFAULT 'draft',
  approved_at timestamptz,
  approved_by uuid REFERENCES identities(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_calendars_session_order CHECK (session_end > session_start),
  CONSTRAINT school_calendars_school_year_unique UNIQUE (school_id, academic_year_label)
);

COMMENT ON COLUMN school_calendars.weekly_offs IS
  'ISO dow: 1=Monday … 7=Sunday. Default {6} = Saturday (common Nepal private school).';

CREATE TABLE terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_calendar_id uuid NOT NULL REFERENCES school_calendars(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reporting_type terminal_reporting_type NOT NULL DEFAULT 'formative',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT terminals_date_order CHECK (end_date >= start_date)
);

COMMENT ON TABLE terminals IS
  'Coverage and reporting boundaries only. No test-date field — by design.';

CREATE TABLE calendar_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_calendar_id uuid NOT NULL REFERENCES school_calendars(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('festival_template', 'manual', 'local')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_closures_date_order CHECK (end_date >= start_date)
);

-- teaching_days: one row per (terminal, calendar day) that is a teaching day.
-- Recomputed on read from span − weekly_offs − closures.
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
)
SELECT
  terminal_id,
  school_calendar_id,
  school_id,
  day,
  ROW_NUMBER() OVER (PARTITION BY terminal_id ORDER BY day) AS day_index
FROM closed;

COMMENT ON VIEW teaching_days IS
  'Derived teaching days per terminal. Never materialize as a cached count column.';

-- Map / progress stubs (generator service is Phase 1).
CREATE TABLE yearly_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_calendar_id uuid NOT NULL REFERENCES school_calendars(id) ON DELETE CASCADE,
  section_id uuid REFERENCES sections(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'superseded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE map_slices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yearly_map_id uuid NOT NULL REFERENCES yearly_map(id) ON DELETE CASCADE,
  terminal_id uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  teaching_day_index int NOT NULL,
  theme_or_chapter text,
  outcome_refs uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_slice_id uuid NOT NULL REFERENCES map_slices(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'done', 'skipped')),
  marked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN lesson_progress.status IS
  'done means taught (coverage), not learned — learning is student_outcomes.';

CREATE TRIGGER school_calendars_set_updated_at
  BEFORE UPDATE ON school_calendars FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER terminals_set_updated_at
  BEFORE UPDATE ON terminals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER calendar_closures_set_updated_at
  BEFORE UPDATE ON calendar_closures FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER yearly_map_set_updated_at
  BEFORE UPDATE ON yearly_map FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER map_slices_set_updated_at
  BEFORE UPDATE ON map_slices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER lesson_progress_set_updated_at
  BEFORE UPDATE ON lesson_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE school_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_slices ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY school_calendars_member_read ON school_calendars FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_memberships sm
      WHERE sm.school_id = school_calendars.school_id
        AND sm.identity_id = current_identity_id()
        AND sm.status = 'active'
    )
  );

CREATE POLICY terminals_member_read ON terminals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM school_calendars sc
      JOIN school_memberships sm ON sm.school_id = sc.school_id
      WHERE sc.id = terminals.school_calendar_id
        AND sm.identity_id = current_identity_id()
        AND sm.status = 'active'
    )
  );

CREATE POLICY calendar_closures_member_read ON calendar_closures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM school_calendars sc
      JOIN school_memberships sm ON sm.school_id = sc.school_id
      WHERE sc.id = calendar_closures.school_calendar_id
        AND sm.identity_id = current_identity_id()
        AND sm.status = 'active'
    )
  );
