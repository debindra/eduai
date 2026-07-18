-- Phase 5: cost/caching + career layer.
-- New tables:
--   certification_progress      — 12-week WhatsApp credential programme (weekly quiz).
--   certification_observations  — the single human-scored observed-teaching-session record.
--   out_of_segment_query_log    — demand signal: a school requests a band outside its licence.
-- Cache-hit metrics are in-process counters (no table) — see apps/api CacheMetricsService.

-- ---------------------------------------------------------------------------
-- P5-API-CERT-01: certification_progress (per-week quiz) + one observation
-- ---------------------------------------------------------------------------
CREATE TABLE certification_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  week int NOT NULL CHECK (week BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'quiz_passed', 'quiz_failed')),
  quiz_score numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certification_progress_unique UNIQUE (teacher_id, week)
);

COMMENT ON TABLE certification_progress IS
  'One row per (teacher, week) of the 12-week credential programme. Weekly quiz '
  'is deterministically scored — no AI. Career layer, never joined to a child.';

CREATE INDEX certification_progress_teacher_id_idx ON certification_progress (teacher_id);

CREATE TRIGGER certification_progress_set_updated_at
  BEFORE UPDATE ON certification_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE certification_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL UNIQUE REFERENCES teachers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'passed', 'failed')),
  score numeric,
  scored_by uuid REFERENCES identities(id) ON DELETE SET NULL,
  scored_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE certification_observations IS
  'The single human-scored observed-teaching-session per teacher. Written only by '
  'an elevated role (assessor/admin) — never self-scored by the teacher.';

CREATE TRIGGER certification_observations_set_updated_at
  BEFORE UPDATE ON certification_observations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- P5-API-02: out_of_segment_query_log (Phase-2 demand signal)
-- ---------------------------------------------------------------------------
CREATE TABLE out_of_segment_query_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  requested_feature text NOT NULL,
  requested_band text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE out_of_segment_query_log IS
  'Append-only demand signal: logged when a school requests a feature for a band '
  'outside its licensed_band_range. Admin surface returns counts/shapes only '
  '(gravity rule). No SELECT policies for standard roles — service role only.';

CREATE INDEX out_of_segment_query_log_school_id_idx ON out_of_segment_query_log (school_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE certification_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE out_of_segment_query_log ENABLE ROW LEVEL SECURITY;

-- Teacher reads only her own credential progress (writes go through the service role API).
CREATE POLICY certification_progress_self_read ON certification_progress
  FOR SELECT TO authenticated
  USING (teacher_id = current_teacher_id());

CREATE POLICY certification_observations_self_read ON certification_observations
  FOR SELECT TO authenticated
  USING (teacher_id = current_teacher_id());

-- out_of_segment_query_log: no policies for authenticated — service role only (fail closed).
