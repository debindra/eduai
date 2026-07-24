-- Phase 9 Track C: Guideline 2083 indicator engine (BidyaSetu v3.3 6–8, 12)
-- assessment_areas / indicators / append-only ratings / chapter→area crosswalk
-- Pilot structural seed: Grade 4 English Unit 1 (not the full descriptor bank)

CREATE TYPE rating_stage AS ENUM ('regular', 'additional_support');
CREATE TYPE rating_state AS ENUM ('proposed', 'confirmed');
CREATE TYPE grouping_shape AS ENUM ('skill', 'content', 'flat');

-- ---------------------------------------------------------------------------
-- assessment_areas (replaces doc-era "units")
-- ---------------------------------------------------------------------------
CREATE TABLE assessment_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  level_id int NOT NULL CHECK (level_id BETWEEN 1 AND 10),
  code text NOT NULL,
  display_label text NOT NULL,
  grouping_shape grouping_shape NOT NULL DEFAULT 'flat',
  default_sequence int NOT NULL DEFAULT 0,
  indicator_count int NOT NULL CHECK (indicator_count > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, level_id, code)
);

COMMENT ON TABLE assessment_areas IS
  'Guideline 2083 assessment areas. indicator_count is annex N (I6). '
  'display_label is subject-configured (Unit / Genre / विषयक्षेत्र).';

COMMENT ON COLUMN assessment_areas.indicator_count IS
  'Annex indicator count N — area denominator is 4×N. Never hardcode in app.';

-- ---------------------------------------------------------------------------
-- indicators (assessable atom — I1)
-- ---------------------------------------------------------------------------
CREATE TABLE indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_area_id uuid NOT NULL REFERENCES assessment_areas(id) ON DELETE CASCADE,
  level_id int NOT NULL CHECK (level_id BETWEEN 1 AND 10),
  code text NOT NULL,
  statement_en text NOT NULL,
  statement_np text,
  group_label text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_area_id, code)
);

COMMENT ON TABLE indicators IS
  'Assessable atom (अनुसूची ३). Identical text across grades = separate rows '
  'keyed by level_id (I4). Ratings attach here — never to 3 outcomes.';

COMMENT ON COLUMN indicators.group_label IS
  'Nullable subject-configured grouping (I3). Never a skill enum.';

-- ---------------------------------------------------------------------------
-- ratings (append-only — I7)
-- ---------------------------------------------------------------------------
CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  indicator_id uuid NOT NULL REFERENCES indicators(id) ON DELETE RESTRICT,
  stage rating_stage NOT NULL DEFAULT 'regular',
  rated_on date NOT NULL DEFAULT CURRENT_DATE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 4),
  capture_mode text,
  author_id uuid REFERENCES identities(id) ON DELETE SET NULL,
  state rating_state NOT NULL DEFAULT 'proposed',
  confirmed_by uuid REFERENCES identities(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ratings IS
  'Append-only indicator ratings (I7). Corrections = new INSERT. '
  'Propose→confirm preserves level-is-human. Scale is 1–4 only (I2).';

-- Block UPDATE/DELETE of confirmed rating values (I7)
CREATE OR REPLACE FUNCTION ratings_block_confirmed_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state = 'confirmed' THEN
      RAISE EXCEPTION 'I7: confirmed ratings cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: once confirmed, rating payload is immutable; allow confirm transition
  IF OLD.state = 'confirmed' THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.stage IS DISTINCT FROM OLD.stage
       OR NEW.indicator_id IS DISTINCT FROM OLD.indicator_id
       OR NEW.child_id IS DISTINCT FROM OLD.child_id
       OR NEW.rated_on IS DISTINCT FROM OLD.rated_on
       OR NEW.state IS DISTINCT FROM OLD.state THEN
      RAISE EXCEPTION 'I7: confirmed ratings are immutable — insert a correction row';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ratings_immutable_confirmed
  BEFORE UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION ratings_block_confirmed_mutation();

-- ---------------------------------------------------------------------------
-- Book crosswalk (I9) — book-optional
-- ---------------------------------------------------------------------------
CREATE TABLE book_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  level_id int NOT NULL,
  code text NOT NULL,
  title_en text NOT NULL,
  title_np text,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (subject_id, level_id, code)
);

CREATE TABLE chapter_area_crosswalk (
  chapter_id uuid NOT NULL REFERENCES book_chapters(id) ON DELETE CASCADE,
  assessment_area_id uuid NOT NULL REFERENCES assessment_areas(id) ON DELETE CASCADE,
  PRIMARY KEY (chapter_id, assessment_area_id)
);

COMMENT ON TABLE chapter_area_crosswalk IS
  'I9: book_chapter → assessment_area. Engine runs with empty crosswalk.';

CREATE TRIGGER assessment_areas_set_updated_at
  BEFORE UPDATE ON assessment_areas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER indicators_set_updated_at
  BEFORE UPDATE ON indicators FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Structural seed: Grade 4 English Unit 1 (pilot subject — not full bank)
-- English subject id from Phase 3/4: d1111111-…112
-- ---------------------------------------------------------------------------
INSERT INTO assessment_areas (
  id, subject_id, level_id, code, display_label, grouping_shape,
  default_sequence, indicator_count
) VALUES (
  'aa000004-e004-0000-0000-000000000001',
  'd1111111-1111-1111-1111-111111111112',
  4,
  'ENG4-U1',
  'Unit 1',
  'skill',
  1,
  4
) ON CONFLICT (subject_id, level_id, code) DO NOTHING;

INSERT INTO indicators (
  id, assessment_area_id, level_id, code, statement_en, statement_np,
  group_label, sort_order
) VALUES
  ('1d000004-e004-0000-0000-000000000001', 'aa000004-e004-0000-0000-000000000001', 4, 'ENG4.U1.1',
   'Placeholder G4 English Unit 1 indicator 1 — replace with annex extraction', NULL, 'L', 1),
  ('1d000004-e004-0000-0000-000000000002', 'aa000004-e004-0000-0000-000000000001', 4, 'ENG4.U1.2',
   'Placeholder G4 English Unit 1 indicator 2 — replace with annex extraction', NULL, 'S', 2),
  ('1d000004-e004-0000-0000-000000000003', 'aa000004-e004-0000-0000-000000000001', 4, 'ENG4.U1.3',
   'Placeholder G4 English Unit 1 indicator 3 — replace with annex extraction', NULL, 'R', 3),
  ('1d000004-e004-0000-0000-000000000004', 'aa000004-e004-0000-0000-000000000001', 4, 'ENG4.U1.4',
   'Placeholder G4 English Unit 1 indicator 4 — replace with annex extraction', NULL, 'W', 4)
ON CONFLICT (assessment_area_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE assessment_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_area_crosswalk ENABLE ROW LEVEL SECURITY;

CREATE POLICY assessment_areas_member_read ON assessment_areas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY indicators_member_read ON indicators
  FOR SELECT TO authenticated USING (true);
CREATE POLICY book_chapters_member_read ON book_chapters
  FOR SELECT TO authenticated USING (true);
CREATE POLICY chapter_area_crosswalk_member_read ON chapter_area_crosswalk
  FOR SELECT TO authenticated USING (true);

-- Ratings: reuse two-grain helpers (section read; subject write via area).
CREATE POLICY ratings_select_scoped ON ratings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = ratings.child_id
        AND teacher_has_section_read(c.section_id)
    )
  );

CREATE POLICY ratings_insert_scoped ON ratings FOR INSERT TO authenticated
  WITH CHECK (
    state = 'proposed'
    AND EXISTS (
      SELECT 1
      FROM children c
      JOIN indicators ind ON ind.id = ratings.indicator_id
      JOIN assessment_areas aa ON aa.id = ind.assessment_area_id
      WHERE c.id = ratings.child_id
        AND teacher_has_section_subject_write(c.section_id, aa.subject_id)
    )
  );

CREATE POLICY ratings_update_scoped ON ratings FOR UPDATE TO authenticated
  USING (
    state = 'proposed'
    AND EXISTS (
      SELECT 1
      FROM children c
      JOIN indicators ind ON ind.id = ratings.indicator_id
      JOIN assessment_areas aa ON aa.id = ind.assessment_area_id
      WHERE c.id = ratings.child_id
        AND teacher_has_section_subject_write(c.section_id, aa.subject_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM children c
      JOIN indicators ind ON ind.id = ratings.indicator_id
      JOIN assessment_areas aa ON aa.id = ind.assessment_area_id
      WHERE c.id = ratings.child_id
        AND teacher_has_section_subject_write(c.section_id, aa.subject_id)
    )
  );
