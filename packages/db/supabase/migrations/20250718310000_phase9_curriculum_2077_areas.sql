-- Phase 9 Track B: Curriculum 2077 pre-primary taxonomy (BidyaSetu v3.3 5 / 12)
-- 11 curriculum_areas (system of record) → 6 rollup_domains (parent/principal)
-- Pre-primary scale: not_yet / developing / can_do (+ hidden not_observed)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE curriculum_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_en text NOT NULL,
  name_np text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (band_id, code)
);

COMMENT ON TABLE curriculum_areas IS
  'Curriculum 2077 skill areas (11 at pre-primary) — system of record for '
  'milestone tagging. Rows, not code branches.';

CREATE TABLE rollup_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_en text NOT NULL,
  name_np text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (band_id, code)
);

COMMENT ON TABLE rollup_domains IS
  'Parent/principal-facing domains (6 at pre-primary). Teachers may see all '
  'curriculum_areas; parents and principals see these rollups.';

CREATE TABLE area_domain_crosswalk (
  area_id uuid NOT NULL REFERENCES curriculum_areas(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES rollup_domains(id) ON DELETE CASCADE,
  PRIMARY KEY (area_id, domain_id)
);

COMMENT ON TABLE area_domain_crosswalk IS
  '11→6 Curriculum 2077 rollup. Content is trainer/ECE-owned structure.';

ALTER TABLE outcomes
  ADD COLUMN IF NOT EXISTS curriculum_area_id uuid
    REFERENCES curriculum_areas(id) ON DELETE SET NULL;

COMMENT ON COLUMN outcomes.curriculum_area_id IS
  'Required for framework=milestone once bank is tagged. NULL allowed during '
  'placeholder transition.';

CREATE TRIGGER curriculum_areas_set_updated_at
  BEFORE UPDATE ON curriculum_areas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER rollup_domains_set_updated_at
  BEFORE UPDATE ON rollup_domains FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed: 11 Curriculum 2077 areas + 6 parent domains + crosswalk (v3.3 5.2)
-- Stable UUIDs for fixtures.
-- ---------------------------------------------------------------------------
-- Areas
INSERT INTO curriculum_areas (id, band_id, code, name_en, name_np, sort_order) VALUES
  ('ca000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'physical', 'Physical skills', 'शारीरिक सीप', 1),
  ('ca000001-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'health_nutrition_safety', 'Health, nutrition, safety & environment', 'स्वास्थ्य, पोषण, सुरक्षा र वातावरण', 2),
  ('ca000001-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'language', 'Language skills', 'भाषा सीप', 3),
  ('ca000001-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'intellectual', 'Intellectual & mental skills', 'बौद्धिक तथा मानसिक सीप', 4),
  ('ca000001-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pre_math', 'Pre-mathematics', 'पूर्व-गणित', 5),
  ('ca000001-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'emotional', 'Emotional skills', 'भावनात्मक सीप', 6),
  ('ca000001-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'social_cultural_moral', 'Social, cultural & moral skills', 'सामाजिक, सांस्कृतिक तथा नैतिक सीप', 7),
  ('ca000001-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'creative', 'Creative skills', 'सृजनात्मक सीप', 8),
  ('ca000001-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'visual_arts', 'Visual arts, technique & creativity', 'दृश्य कला, प्रविधि र सृजनात्मकता', 9),
  ('ca000001-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'environmental_science', 'Environmental science', 'वातावरण विज्ञान', 10),
  ('ca000001-0000-0000-0000-00000000000b', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'social_studies', 'Social studies', 'सामाजिक अध्ययन', 11)
ON CONFLICT (band_id, code) DO NOTHING;

-- Domains D1–D6
INSERT INTO rollup_domains (id, band_id, code, name_en, name_np, sort_order) VALUES
  ('cd000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'D1', 'Physical & Well-being', 'शारीरिक तथा कल्याण', 1),
  ('cd000001-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'D2', 'Language & Communication', 'भाषा तथा सञ्चार', 2),
  ('cd000001-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'D3', 'Thinking & Early Maths', 'सोच र प्रारम्भिक गणित', 3),
  ('cd000001-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'D4', 'Social & Emotional', 'सामाजिक तथा भावनात्मक', 4),
  ('cd000001-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'D5', 'Creative & Expressive', 'सृजनात्मक तथा अभिव्यक्तिमूलक', 5),
  ('cd000001-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'D6', 'World Around Me', 'मेरो वरिपरिको संसार', 6)
ON CONFLICT (band_id, code) DO NOTHING;

-- Crosswalk (v3.3 5.2)
INSERT INTO area_domain_crosswalk (area_id, domain_id) VALUES
  ('ca000001-0000-0000-0000-000000000001', 'cd000001-0000-0000-0000-000000000001'), -- physical → D1
  ('ca000001-0000-0000-0000-000000000002', 'cd000001-0000-0000-0000-000000000001'), -- health → D1
  ('ca000001-0000-0000-0000-000000000003', 'cd000001-0000-0000-0000-000000000002'), -- language → D2
  ('ca000001-0000-0000-0000-000000000004', 'cd000001-0000-0000-0000-000000000003'), -- intellectual → D3
  ('ca000001-0000-0000-0000-000000000005', 'cd000001-0000-0000-0000-000000000003'), -- pre_math → D3
  ('ca000001-0000-0000-0000-000000000006', 'cd000001-0000-0000-0000-000000000004'), -- emotional → D4
  ('ca000001-0000-0000-0000-000000000007', 'cd000001-0000-0000-0000-000000000004'), -- social_cultural → D4
  ('ca000001-0000-0000-0000-000000000008', 'cd000001-0000-0000-0000-000000000005'), -- creative → D5
  ('ca000001-0000-0000-0000-000000000009', 'cd000001-0000-0000-0000-000000000005'), -- visual_arts → D5
  ('ca000001-0000-0000-0000-00000000000a', 'cd000001-0000-0000-0000-000000000006'), -- env sci → D6
  ('ca000001-0000-0000-0000-00000000000b', 'cd000001-0000-0000-0000-000000000006')  -- social studies → D6
ON CONFLICT DO NOTHING;

-- Tag placeholder milestone to language area (structural; real bank is trainer-owned)
UPDATE outcomes
SET curriculum_area_id = 'ca000001-0000-0000-0000-000000000003'
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  AND curriculum_area_id IS NULL;

-- ---------------------------------------------------------------------------
-- Scale rename: emerging → not_yet, secure → can_do
-- not_observed is hidden / non-scored — not inserted as a grade_scales row.
-- ---------------------------------------------------------------------------
UPDATE grade_scales
SET code = 'not_yet',
    label_en = 'Not yet',
    label_np = 'अहिले होइन'
WHERE band_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND code = 'emerging';

UPDATE grade_scales
SET code = 'can_do',
    label_en = 'Can do',
    label_np = 'सक्छ'
WHERE band_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND code = 'secure';

-- Migrate any existing pre-primary student_outcomes rating codes
UPDATE student_outcomes
SET rating_code = 'not_yet'
WHERE rating_code = 'emerging';

UPDATE student_outcomes
SET rating_code = 'can_do'
WHERE rating_code = 'secure';

-- ---------------------------------------------------------------------------
-- RLS (member read — config tables)
-- ---------------------------------------------------------------------------
ALTER TABLE curriculum_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rollup_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_domain_crosswalk ENABLE ROW LEVEL SECURITY;

CREATE POLICY curriculum_areas_member_read ON curriculum_areas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rollup_domains_member_read ON rollup_domains
  FOR SELECT TO authenticated USING (true);
CREATE POLICY area_domain_crosswalk_member_read ON area_domain_crosswalk
  FOR SELECT TO authenticated USING (true);
