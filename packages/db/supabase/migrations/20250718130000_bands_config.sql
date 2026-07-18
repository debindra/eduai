-- Band-as-data config layer (pre_primary seed). Grades 1–3 / 4–5 rows land later.
-- sections.band_id gains a real FK once bands exist.

CREATE TABLE bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_np text,
  assessment_mode text NOT NULL,
  aggregation_rule text,
  grade_range text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bands IS
  'Band-as-data: assessment_mode / aggregation_rule drive behaviour. '
  'Never branch on grade numbers in application code.';

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_np text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE band_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (band_id, subject_id)
);

CREATE TABLE grade_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  code text NOT NULL,
  label_en text NOT NULL,
  label_np text,
  sort_order int NOT NULL,
  numeric_value numeric,
  UNIQUE (band_id, code)
);

CREATE TABLE outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  code text NOT NULL,
  framework text NOT NULL DEFAULT 'milestone',
  statement_en text NOT NULL,
  statement_np text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (band_id, code)
);

COMMENT ON COLUMN outcomes.subject_id IS
  'NULL at pre-primary (holistic milestones). Populated from Grade 1.';

CREATE TRIGGER bands_set_updated_at
  BEFORE UPDATE ON bands FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER subjects_set_updated_at
  BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER outcomes_set_updated_at
  BEFORE UPDATE ON outcomes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Stable pre_primary band id for seed/section FK.
INSERT INTO bands (id, code, name_en, name_np, assessment_mode, aggregation_rule, grade_range)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'pre_primary',
  'Pre-primary',
  'पूर्व-प्राथमिक',
  'three_state_narrative',
  'none',
  'Nursery–UKG'
);

INSERT INTO grade_scales (band_id, code, label_en, label_np, sort_order, numeric_value)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'emerging', 'Emerging', 'उदीयमान', 1, 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'developing', 'Developing', 'विकासशील', 2, 2),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'secure', 'Secure', 'सुदृढ', 3, 3);

-- Placeholder outcome so map_slices / fixtures have an FK target (trainer content later).
INSERT INTO outcomes (id, band_id, subject_id, code, framework, statement_en, statement_np, sort_order)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NULL,
  'PP-PLACEHOLDER-001',
  'milestone',
  'Placeholder milestone — replace with trainer-authored bank',
  'placeholder',
  1
);

ALTER TABLE sections
  ADD CONSTRAINT sections_band_id_fkey
  FOREIGN KEY (band_id) REFERENCES bands(id);

ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

-- Config tables: any active school member may read.
CREATE POLICY bands_member_read ON bands FOR SELECT TO authenticated
  USING (current_identity_id() IS NOT NULL);
CREATE POLICY subjects_member_read ON subjects FOR SELECT TO authenticated
  USING (current_identity_id() IS NOT NULL);
CREATE POLICY band_subjects_member_read ON band_subjects FOR SELECT TO authenticated
  USING (current_identity_id() IS NOT NULL);
CREATE POLICY grade_scales_member_read ON grade_scales FOR SELECT TO authenticated
  USING (current_identity_id() IS NOT NULL);
CREATE POLICY outcomes_member_read ON outcomes FOR SELECT TO authenticated
  USING (current_identity_id() IS NOT NULL);
