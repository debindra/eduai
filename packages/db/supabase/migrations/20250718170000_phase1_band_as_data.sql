-- Phase 1: prompts, map RLS, map_slice_outcomes, weekly overrides,
-- lesson drafts, parent report drafts. Band-as-data config, not grade branches.

-- ---------------------------------------------------------------------------
-- prompts: (feature_id, band_id) lookup — runtime source of truth for AI text
-- ---------------------------------------------------------------------------
CREATE TABLE prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id text NOT NULL,
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  model_tier text NOT NULL CHECK (model_tier IN ('haiku', 'sonnet', 'none')),
  system_template text NOT NULL,
  validator_keys text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_id, band_id)
);

COMMENT ON TABLE prompts IS
  'Prompt templates keyed by (feature_id, band_id). Application code must not inline band prompt strings.';

CREATE TRIGGER prompts_set_updated_at
  BEFORE UPDATE ON prompts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY prompts_member_read ON prompts FOR SELECT TO authenticated
  USING (current_identity_id() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- map_slice_outcomes: FK integrity for outcome refs on slices
-- ---------------------------------------------------------------------------
CREATE TABLE map_slice_outcomes (
  map_slice_id uuid NOT NULL REFERENCES map_slices(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES outcomes(id) ON DELETE RESTRICT,
  PRIMARY KEY (map_slice_id, outcome_id)
);

COMMENT ON TABLE map_slice_outcomes IS
  'Canonical outcome refs for a map slice. Prefer this over map_slices.outcome_refs[] for FK integrity.';

ALTER TABLE map_slice_outcomes ENABLE ROW LEVEL SECURITY;

-- Sync trigger: keep outcome_refs array aligned with join table (read convenience).
CREATE OR REPLACE FUNCTION sync_map_slice_outcome_refs()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE map_slices
    SET outcome_refs = COALESCE(
      (SELECT array_agg(outcome_id ORDER BY outcome_id)
       FROM map_slice_outcomes WHERE map_slice_id = OLD.map_slice_id),
      '{}'::uuid[]
    )
    WHERE id = OLD.map_slice_id;
    RETURN OLD;
  END IF;
  UPDATE map_slices
  SET outcome_refs = COALESCE(
    (SELECT array_agg(outcome_id ORDER BY outcome_id)
     FROM map_slice_outcomes WHERE map_slice_id = NEW.map_slice_id),
    '{}'::uuid[]
  )
  WHERE id = NEW.map_slice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER map_slice_outcomes_sync_refs
  AFTER INSERT OR DELETE ON map_slice_outcomes
  FOR EACH ROW EXECUTE FUNCTION sync_map_slice_outcome_refs();

-- ---------------------------------------------------------------------------
-- weekly_plan_overrides: Sunday teacher adjust on cascade
-- ---------------------------------------------------------------------------
CREATE TABLE weekly_plan_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  day_date date NOT NULL,
  theme_or_chapter text,
  notes text,
  updated_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, day_date)
);

CREATE TRIGGER weekly_plan_overrides_set_updated_at
  BEFORE UPDATE ON weekly_plan_overrides FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE weekly_plan_overrides ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- lesson_drafts: AI-generated lesson plans (coverage track, not learning)
-- ---------------------------------------------------------------------------
CREATE TABLE lesson_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_slice_id uuid NOT NULL REFERENCES map_slices(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  pedagogy_type text NOT NULL CHECK (pedagogy_type IN ('five_e', 'explicit_instruction')),
  content jsonb NOT NULL DEFAULT '{}',
  generated_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER lesson_drafts_set_updated_at
  BEFORE UPDATE ON lesson_drafts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE lesson_drafts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- parent_report_drafts: Sonnet draft → teacher approve (level is human)
-- ---------------------------------------------------------------------------
CREATE TABLE parent_report_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  state text NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'approved', 'rejected')),
  body_text text,
  thin_data boolean NOT NULL DEFAULT false,
  evidence_snapshot jsonb NOT NULL DEFAULT '[]',
  generated_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN parent_report_drafts.thin_data IS
  'When true, body_text is the neutral fallback — never fiction from the model.';

CREATE TRIGGER parent_report_drafts_set_updated_at
  BEFORE UPDATE ON parent_report_drafts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE parent_report_drafts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- coach_messages: private teacher chat — never joined to child
-- ---------------------------------------------------------------------------
CREATE TABLE coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  body text NOT NULL,
  safeguarding_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE coach_messages IS
  'Classroom coach transcript. No child_id by design — excluded from handover.';

ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS: yearly_map / map_slices (were ENABLE without policies)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION teacher_can_access_yearly_map(p_map_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM yearly_map ym
    WHERE ym.id = p_map_id
      AND ym.section_id IS NOT NULL
      AND teacher_has_section_read(ym.section_id)
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY yearly_map_teacher_read ON yearly_map FOR SELECT TO authenticated
  USING (
    section_id IS NOT NULL AND teacher_has_section_read(section_id)
  );

CREATE POLICY yearly_map_teacher_write ON yearly_map FOR ALL TO authenticated
  USING (
    section_id IS NOT NULL AND teacher_has_section_read(section_id)
  )
  WITH CHECK (
    section_id IS NOT NULL AND teacher_has_section_read(section_id)
  );

CREATE POLICY map_slices_teacher_read ON map_slices FOR SELECT TO authenticated
  USING (teacher_can_access_yearly_map(yearly_map_id));

CREATE POLICY map_slices_teacher_write ON map_slices FOR ALL TO authenticated
  USING (teacher_can_access_yearly_map(yearly_map_id))
  WITH CHECK (teacher_can_access_yearly_map(yearly_map_id));

CREATE POLICY map_slice_outcomes_teacher_read ON map_slice_outcomes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM map_slices ms
      WHERE ms.id = map_slice_id
        AND teacher_can_access_yearly_map(ms.yearly_map_id)
    )
  );

CREATE POLICY map_slice_outcomes_teacher_write ON map_slice_outcomes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM map_slices ms
      WHERE ms.id = map_slice_id
        AND teacher_can_access_yearly_map(ms.yearly_map_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM map_slices ms
      WHERE ms.id = map_slice_id
        AND teacher_can_access_yearly_map(ms.yearly_map_id)
    )
  );

CREATE POLICY weekly_plan_overrides_read ON weekly_plan_overrides FOR SELECT TO authenticated
  USING (teacher_has_section_read(section_id));

CREATE POLICY weekly_plan_overrides_write ON weekly_plan_overrides FOR ALL TO authenticated
  USING (teacher_has_section_read(section_id))
  WITH CHECK (teacher_has_section_read(section_id));

CREATE POLICY lesson_drafts_read ON lesson_drafts FOR SELECT TO authenticated
  USING (teacher_has_section_read(section_id));

CREATE POLICY lesson_drafts_write ON lesson_drafts FOR ALL TO authenticated
  USING (teacher_has_section_read(section_id))
  WITH CHECK (teacher_has_section_read(section_id));

CREATE POLICY parent_report_drafts_read ON parent_report_drafts FOR SELECT TO authenticated
  USING (teacher_has_section_read(section_id));

CREATE POLICY parent_report_drafts_write ON parent_report_drafts FOR ALL TO authenticated
  USING (teacher_has_section_read(section_id))
  WITH CHECK (teacher_has_section_read(section_id));

CREATE POLICY coach_messages_self ON coach_messages FOR ALL TO authenticated
  USING (
    teacher_id = current_teacher_id()
  )
  WITH CHECK (
    teacher_id = current_teacher_id()
  );
