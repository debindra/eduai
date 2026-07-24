-- Teacher-read RLS for guardians + guardian_child_links.
-- Same grain as children_teacher_read: section-wide read via teacher_sections.
-- Writes stay NestJS / service-role (roster provisioning).

CREATE POLICY guardians_teacher_read ON guardians
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM guardian_child_links gcl
      JOIN children c ON c.id = gcl.child_id
      WHERE gcl.guardian_id = guardians.id
        AND teacher_has_section_read(c.section_id)
    )
  );

CREATE POLICY guardian_child_links_teacher_read ON guardian_child_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children c
      WHERE c.id = guardian_child_links.child_id
        AND teacher_has_section_read(c.section_id)
    )
  );
