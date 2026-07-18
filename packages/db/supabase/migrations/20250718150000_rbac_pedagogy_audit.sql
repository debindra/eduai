-- teacher_sections (RBAC backbone), student_outcomes, attendance_record, audit_log.
-- Two-grain RLS: write (section_id, subject_id); class-teacher section-wide read.
-- Pre-primary: subject_id NULL — same policy, not a special case.

CREATE TABLE teacher_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  is_class_teacher boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_sections_unique UNIQUE (teacher_id, section_id, subject_id)
);

COMMENT ON COLUMN teacher_sections.subject_id IS
  'NULL at pre-primary. Write grain is (section_id, subject_id); NULL matches NULL.';

CREATE TYPE outcome_state AS ENUM ('proposed', 'confirmed');

CREATE TABLE student_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES outcomes(id) ON DELETE RESTRICT,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  band_code text,
  rating_code text,
  state outcome_state NOT NULL DEFAULT 'proposed',
  recorded_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  confirmed_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  evidence_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN student_outcomes.state IS
  'AI/mapper writes proposed only. confirmed requires explicit teacher action.';

CREATE INDEX student_outcomes_child_id_idx ON student_outcomes (child_id);
CREATE INDEX student_outcomes_section_id_idx ON student_outcomes (section_id);

CREATE TABLE attendance_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  day date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  recorded_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_record_unique UNIQUE (child_id, day)
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_identity_id uuid REFERENCES identities(id) ON DELETE SET NULL,
  action text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}',
  justification_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_log IS
  'Append-only. No SELECT policies for standard roles — ops/service role only.';

CREATE TRIGGER teacher_sections_set_updated_at
  BEFORE UPDATE ON teacher_sections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER student_outcomes_set_updated_at
  BEFORE UPDATE ON student_outcomes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER attendance_record_set_updated_at
  BEFORE UPDATE ON attendance_record FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helpers for two-grain checks
CREATE OR REPLACE FUNCTION teacher_has_section_subject_write(
  p_section_id uuid,
  p_subject_id uuid
)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_sections ts
    WHERE ts.teacher_id = current_teacher_id()
      AND ts.section_id = p_section_id
      AND ts.subject_id IS NOT DISTINCT FROM p_subject_id
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION teacher_has_section_read(p_section_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_sections ts
    WHERE ts.teacher_id = current_teacher_id()
      AND ts.section_id = p_section_id
      AND (
        ts.is_class_teacher = true
        OR true  -- subject teachers also read their section rows they write
      )
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION teacher_has_section_read IS
  'Section-wide read if any teacher_sections row exists for the section '
  '(class teacher or subject teacher). Write stays subject-grained.';

ALTER TABLE teacher_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_sections_self_read ON teacher_sections FOR SELECT TO authenticated
  USING (teacher_id = current_teacher_id());

CREATE POLICY student_outcomes_read_section ON student_outcomes FOR SELECT TO authenticated
  USING (teacher_has_section_read(section_id));

CREATE POLICY student_outcomes_write_subject_scope ON student_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_has_section_subject_write(section_id, subject_id)
    AND state = 'proposed'
  );

CREATE POLICY student_outcomes_update_subject_scope ON student_outcomes
  FOR UPDATE TO authenticated
  USING (teacher_has_section_subject_write(section_id, subject_id))
  WITH CHECK (teacher_has_section_subject_write(section_id, subject_id));

CREATE POLICY attendance_record_read_section ON attendance_record FOR SELECT TO authenticated
  USING (teacher_has_section_read(section_id));

CREATE POLICY attendance_record_write_section ON attendance_record
  FOR INSERT TO authenticated
  WITH CHECK (teacher_has_section_read(section_id));

CREATE POLICY attendance_record_update_section ON attendance_record
  FOR UPDATE TO authenticated
  USING (teacher_has_section_read(section_id))
  WITH CHECK (teacher_has_section_read(section_id));

-- Sections / children readable when teacher has any grain on the section.
CREATE POLICY sections_teacher_read ON sections FOR SELECT TO authenticated
  USING (teacher_has_section_read(id));

CREATE POLICY children_teacher_read ON children FOR SELECT TO authenticated
  USING (teacher_has_section_read(section_id));

CREATE POLICY lesson_progress_read ON lesson_progress FOR SELECT TO authenticated
  USING (teacher_has_section_read(section_id));

CREATE POLICY lesson_progress_write ON lesson_progress
  FOR ALL TO authenticated
  USING (teacher_has_section_read(section_id))
  WITH CHECK (teacher_has_section_read(section_id));

-- audit_log: no policies for authenticated — service role only (fail closed).
