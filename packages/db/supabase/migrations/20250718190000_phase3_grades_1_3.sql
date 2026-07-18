-- Phase 3: Grades 1–3 band-as-data, attempt enum, remedial_plans, Annex template types.

-- ---------------------------------------------------------------------------
-- P3-DB-01: grade_scales kind + percent cut-offs; basic_early band + subjects
-- ---------------------------------------------------------------------------
ALTER TABLE grade_scales
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'rating'
    CHECK (kind IN ('rating', 'letter')),
  ADD COLUMN IF NOT EXISTS min_percent numeric,
  ADD COLUMN IF NOT EXISTS max_percent numeric;

COMMENT ON COLUMN grade_scales.kind IS
  'rating = per-outcome scale (1–4 / emerging–secure); letter = terminal aggregate cut-offs (E–A+).';

-- Stable basic_early band id for seed/section FK.
-- Stable id: be000000-... (basic_early). Do not reuse calendar/seed bbbb… ids.
INSERT INTO bands (id, code, name_en, name_np, assessment_mode, aggregation_rule, grade_range)
VALUES (
  'be000000-0000-0000-0000-000000000001',
  'basic_early',
  'Basic education (early)',
  'आधारभूत शिक्षा (प्रारम्भिक)',
  'four_point_scale',
  'mean_of_four_percent_letter',
  'Grade 1–3'
)
ON CONFLICT (code) DO NOTHING;

-- Core subjects for Grades 1–3
INSERT INTO subjects (id, code, name_en, name_np) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'nepali', 'Nepali', 'नेपाली'),
  ('d1111111-1111-1111-1111-111111111112', 'english', 'English', 'अंग्रेजी'),
  ('d1111111-1111-1111-1111-111111111113', 'math', 'Mathematics', 'गणित'),
  ('d1111111-1111-1111-1111-111111111114', 'science', 'Science', 'विज्ञान'),
  ('d1111111-1111-1111-1111-111111111115', 'social', 'Social Studies', 'सामाजिक अध्ययन')
ON CONFLICT (code) DO NOTHING;

INSERT INTO band_subjects (band_id, subject_id, sort_order) VALUES
  ('be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 1),
  ('be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111112', 2),
  ('be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111113', 3),
  ('be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111114', 4),
  ('be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111115', 5)
ON CONFLICT (band_id, subject_id) DO NOTHING;

-- 1–4 CDC rating scale (kind=rating)
INSERT INTO grade_scales (band_id, code, label_en, label_np, sort_order, numeric_value, kind) VALUES
  ('be000000-0000-0000-0000-000000000001', '1', 'Beginning', 'आरम्भ', 1, 1, 'rating'),
  ('be000000-0000-0000-0000-000000000001', '2', 'Developing', 'विकासशील', 2, 2, 'rating'),
  ('be000000-0000-0000-0000-000000000001', '3', 'Proficient', 'दक्ष', 3, 3, 'rating'),
  ('be000000-0000-0000-0000-000000000001', '4', 'Advanced', 'उन्नत', 4, 4, 'rating')
ON CONFLICT (band_id, code) DO NOTHING;

-- E–A+ letter grades with percentage cut-offs (kind=letter)
INSERT INTO grade_scales (band_id, code, label_en, label_np, sort_order, numeric_value, kind, min_percent, max_percent) VALUES
  ('be000000-0000-0000-0000-000000000001', 'E', 'E', 'ई', 1, NULL, 'letter', 0, 19.99),
  ('be000000-0000-0000-0000-000000000001', 'D', 'D', 'डी', 2, NULL, 'letter', 20, 39.99),
  ('be000000-0000-0000-0000-000000000001', 'C', 'C', 'सी', 3, NULL, 'letter', 40, 59.99),
  ('be000000-0000-0000-0000-000000000001', 'B', 'B', 'बी', 4, NULL, 'letter', 60, 74.99),
  ('be000000-0000-0000-0000-000000000001', 'A', 'A', 'ए', 5, NULL, 'letter', 75, 89.99),
  ('be000000-0000-0000-0000-000000000001', 'A+', 'A+', 'ए+', 6, NULL, 'letter', 90, 100)
ON CONFLICT (band_id, code) DO NOTHING;

-- Mark existing pre_primary scales as rating kind (already default)
UPDATE grade_scales SET kind = 'rating' WHERE band_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Placeholder Grade 1–3 outcomes (trainer bank later)
INSERT INTO outcomes (id, band_id, subject_id, code, framework, statement_en, statement_np, sort_order) VALUES
  ('c3333333-3333-3333-3333-333333333301', 'be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'G1-NEP-001', 'cdc_outcome', 'Reads simple Nepali words with support', 'placeholder', 1),
  ('c3333333-3333-3333-3333-333333333302', 'be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111112', 'G1-ENG-001', 'cdc_outcome', 'Recognises letters and beginning sounds in English', 'placeholder', 2),
  ('c3333333-3333-3333-3333-333333333303', 'be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111113', 'G1-MATH-001', 'cdc_outcome', 'Counts and compares quantities to 20', 'placeholder', 3),
  ('c3333333-3333-3333-3333-333333333304', 'be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111114', 'G1-SCI-001', 'cdc_outcome', 'Observes living and non-living things', 'placeholder', 4),
  ('c3333333-3333-3333-3333-333333333305', 'be000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111115', 'G1-SOC-001', 'cdc_outcome', 'Identifies family and community helpers', 'placeholder', 5)
ON CONFLICT (band_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- P3-DB-02: student_outcomes.attempt + regular-pass immutable trigger
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE outcome_attempt AS ENUM ('regular', 'after_support');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE student_outcomes
  ADD COLUMN IF NOT EXISTS attempt outcome_attempt NOT NULL DEFAULT 'regular';

COMMENT ON COLUMN student_outcomes.attempt IS
  'regular = first assessment; after_support = re-assessment after remedial. Regular confirmed rows are immutable.';

CREATE OR REPLACE FUNCTION enforce_regular_pass_immutable()
RETURNS trigger AS $$
BEGIN
  IF OLD.state = 'confirmed'
     AND OLD.attempt = 'regular'
     AND (
       NEW.rating_code IS DISTINCT FROM OLD.rating_code
       OR NEW.band_code IS DISTINCT FROM OLD.band_code
       OR NEW.attempt IS DISTINCT FROM OLD.attempt
       OR NEW.state IS DISTINCT FROM OLD.state
     ) THEN
    RAISE EXCEPTION 'Confirmed regular student_outcomes rows are immutable; insert after_support instead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS student_outcomes_regular_pass_immutable ON student_outcomes;
CREATE TRIGGER student_outcomes_regular_pass_immutable
  BEFORE UPDATE ON student_outcomes
  FOR EACH ROW EXECUTE FUNCTION enforce_regular_pass_immutable();

-- ---------------------------------------------------------------------------
-- P3-DB-03: remedial_plans lifecycle
-- ---------------------------------------------------------------------------
CREATE TABLE remedial_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES outcomes(id) ON DELETE RESTRICT,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'opened'
    CHECK (state IN (
      'opened',
      'activity_delivered',
      'reassessed',
      'escalated',
      'closed'
    )),
  opened_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  activity_ref text,
  reminder_count int NOT NULL DEFAULT 0,
  next_reminder_at timestamptz,
  reassessed_at timestamptz,
  reassess_outcome_id uuid REFERENCES student_outcomes(id) ON DELETE SET NULL,
  escalated_at timestamptz,
  escalated_to text,
  closed_at timestamptz,
  closed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE remedial_plans IS
  'Remedial loop state machine. Admin queries must return counts only (gravity rule).';

CREATE INDEX remedial_plans_section_id_idx ON remedial_plans (section_id);
CREATE INDEX remedial_plans_child_id_idx ON remedial_plans (child_id);
CREATE INDEX remedial_plans_state_idx ON remedial_plans (state);
CREATE INDEX remedial_plans_next_reminder_at_idx ON remedial_plans (next_reminder_at)
  WHERE next_reminder_at IS NOT NULL AND state NOT IN ('closed', 'escalated');

CREATE TRIGGER remedial_plans_set_updated_at
  BEFORE UPDATE ON remedial_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE remedial_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY remedial_plans_read_section ON remedial_plans FOR SELECT TO authenticated
  USING (teacher_has_section_read(section_id));

CREATE POLICY remedial_plans_insert_subject_scope ON remedial_plans
  FOR INSERT TO authenticated
  WITH CHECK (teacher_has_section_subject_write(section_id, subject_id));

CREATE POLICY remedial_plans_update_subject_scope ON remedial_plans
  FOR UPDATE TO authenticated
  USING (teacher_has_section_subject_write(section_id, subject_id))
  WITH CHECK (teacher_has_section_subject_write(section_id, subject_id));

-- ---------------------------------------------------------------------------
-- Annex 2/3/4 template types on document_render
-- ---------------------------------------------------------------------------
ALTER TABLE document_render DROP CONSTRAINT IF EXISTS document_render_template_type_check;
ALTER TABLE document_render ADD CONSTRAINT document_render_template_type_check
  CHECK (template_type IN (
    'assessment_log',
    'monthly_report',
    'year_end_report',
    'transition_file',
    'inspection_pack',
    'leaving_pack',
    'annex_2',
    'annex_3',
    'annex_4'
  ));
