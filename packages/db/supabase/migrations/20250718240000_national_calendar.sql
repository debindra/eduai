-- Phase 7 / P7-DB-03: national calendar master (govt holidays / festivals / days off).
-- Deterministic; no LLM. Movable festivals are data rows — yearly refresh owner
-- remains an open product item (do not hardcode a single year's dates in app code).

CREATE TYPE national_calendar_status AS ENUM ('draft', 'published');

CREATE TYPE national_closure_category AS ENUM (
  'govt_holiday',
  'festival',
  'day_off'
);

CREATE TABLE national_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bs_year integer NOT NULL,
  status national_calendar_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT national_calendars_bs_year_unique UNIQUE (bs_year)
);

-- At most one published calendar per BS year.
CREATE UNIQUE INDEX national_calendars_one_published_per_bs_year
  ON national_calendars (bs_year)
  WHERE status = 'published';

CREATE TRIGGER national_calendars_set_updated_at
  BEFORE UPDATE ON national_calendars FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE national_calendars IS
  'Global national calendar per BS year. Publishing makes closures visible '
  'to the teaching_days VIEW for all schools.';

CREATE TABLE national_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  national_calendar_id uuid NOT NULL
    REFERENCES national_calendars(id) ON DELETE CASCADE,
  name text NOT NULL,
  category national_closure_category NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  bs_label text,
  movable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT national_closures_end_after_start
    CHECK (end_date >= start_date)
);

CREATE INDEX national_closures_calendar_idx
  ON national_closures (national_calendar_id);

CREATE INDEX national_closures_date_range_idx
  ON national_closures (start_date, end_date);

CREATE TRIGGER national_closures_set_updated_at
  BEFORE UPDATE ON national_closures FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE national_closures IS
  'National closures. AD dates for joinability with teaching_days. '
  'bs_label / movable are presentation + yearly-refresh metadata.';

ALTER TABLE national_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_closures ENABLE ROW LEVEL SECURITY;

-- Authenticated may read published calendars/closures (school wizard overlay).
-- Writes go through Nest service-role + RequirePlatformAdminGuard.
CREATE POLICY national_calendars_published_read ON national_calendars
  FOR SELECT TO authenticated
  USING (status = 'published');

CREATE POLICY national_closures_published_read ON national_closures
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM national_calendars nc
      WHERE nc.id = national_closures.national_calendar_id
        AND nc.status = 'published'
    )
  );
