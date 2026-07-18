-- Phase 2: document_render, handover_pack, message_log, settling programme,
-- schools exit columns. Pre-primary compliance layer.

-- ---------------------------------------------------------------------------
-- schools: exit / retention columns (reuses exit_status)
-- ---------------------------------------------------------------------------
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS exit_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;

COMMENT ON COLUMN schools.exit_requested_at IS
  'When school exit was initiated. deletion_scheduled_at is retention-window end.';

-- ---------------------------------------------------------------------------
-- document_render: deterministic render staleness tracking
-- ---------------------------------------------------------------------------
CREATE TABLE document_render (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL
    CHECK (template_type IN (
      'assessment_log',
      'monthly_report',
      'year_end_report',
      'transition_file',
      'inspection_pack',
      'leaving_pack'
    )),
  child_id uuid REFERENCES children(id) ON DELETE SET NULL,
  section_id uuid REFERENCES sections(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  source_row_hash text NOT NULL,
  storage_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_render_scope CHECK (child_id IS NOT NULL OR section_id IS NOT NULL)
);

COMMENT ON TABLE document_render IS
  'Deterministic document renders. source_row_hash detects staleness vs live rows.';

CREATE INDEX document_render_section_id_idx ON document_render (section_id);
CREATE INDEX document_render_child_id_idx ON document_render (child_id);

CREATE TRIGGER document_render_set_updated_at
  BEFORE UPDATE ON document_render FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE document_render ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_render_teacher_read ON document_render FOR SELECT TO authenticated
  USING (
    (section_id IS NOT NULL AND teacher_has_section_read(section_id))
    OR (
      child_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM children c
        WHERE c.id = document_render.child_id
          AND teacher_has_section_read(c.section_id)
      )
    )
  );

CREATE POLICY document_render_teacher_write ON document_render FOR ALL TO authenticated
  USING (
    (section_id IS NOT NULL AND teacher_has_section_read(section_id))
    OR (
      child_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM children c
        WHERE c.id = document_render.child_id
          AND teacher_has_section_read(c.section_id)
      )
    )
  )
  WITH CHECK (
    (section_id IS NOT NULL AND teacher_has_section_read(section_id))
    OR (
      child_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM children c
        WHERE c.id = document_render.child_id
          AND teacher_has_section_read(c.section_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- handover_pack: materialized snapshot (pre-primary; no portfolio/remedial refs)
-- ---------------------------------------------------------------------------
CREATE TABLE handover_pack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  departing_teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  incoming_teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE handover_pack IS
  'Materialized handover snapshot. Coach chat is structurally excluded (no join).';

CREATE INDEX handover_pack_section_id_idx ON handover_pack (section_id);

CREATE TRIGGER handover_pack_set_updated_at
  BEFORE UPDATE ON handover_pack FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE handover_pack ENABLE ROW LEVEL SECURITY;

CREATE POLICY handover_pack_teacher_read ON handover_pack FOR SELECT TO authenticated
  USING (teacher_has_section_read(section_id));

CREATE POLICY handover_pack_teacher_write ON handover_pack FOR ALL TO authenticated
  USING (teacher_has_section_read(section_id))
  WITH CHECK (teacher_has_section_read(section_id));

-- ---------------------------------------------------------------------------
-- message_log: two-way WhatsApp / family threads
-- ---------------------------------------------------------------------------
CREATE TABLE message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  guardian_id uuid REFERENCES guardians(id) ON DELETE SET NULL,
  thread_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'sms', 'web')),
  intent_route text NOT NULL
    CHECK (intent_route IN ('attendance', 'faq', 'admin', 'teacher_queue')),
  content_ref text NOT NULL,
  draft_reply text,
  approval_status text NOT NULL DEFAULT 'sent'
    CHECK (approval_status IN ('draft', 'approved', 'sent', 'auto')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE message_log IS
  'Per-family message threads. Fees/complaints route to admin, never teacher.';

CREATE INDEX message_log_thread_id_idx ON message_log (thread_id);
CREATE INDEX message_log_child_id_idx ON message_log (child_id);
CREATE INDEX message_log_school_id_idx ON message_log (school_id);
CREATE INDEX message_log_intent_route_idx ON message_log (intent_route);

CREATE TRIGGER message_log_set_updated_at
  BEFORE UPDATE ON message_log FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_log_teacher_read ON message_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = message_log.child_id
        AND teacher_has_section_read(c.section_id)
    )
  );

CREATE POLICY message_log_teacher_write ON message_log FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = message_log.child_id
        AND teacher_has_section_read(c.section_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = message_log.child_id
        AND teacher_has_section_read(c.section_id)
    )
  );

-- ---------------------------------------------------------------------------
-- settling_programme_steps: first-month programme (config, not AI)
-- ---------------------------------------------------------------------------
CREATE TABLE settling_programme_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  week_number smallint NOT NULL CHECK (week_number BETWEEN 1 AND 8),
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (band_id, week_number)
);

CREATE TRIGGER settling_programme_steps_set_updated_at
  BEFORE UPDATE ON settling_programme_steps FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE settling_programme_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY settling_programme_member_read ON settling_programme_steps
  FOR SELECT TO authenticated
  USING (current_identity_id() IS NOT NULL);
