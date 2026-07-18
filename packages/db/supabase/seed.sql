-- Local School X fixture — run via `supabase db reset`.
-- Passwords live in Supabase Auth only. After reset, run:
--   pnpm seed:dev-auth
-- Stable IDs (also referenced by scripts/seed-dev-auth.mjs):
--   school  11111111-1111-1111-1111-111111111111
--   section 66666666-6666-6666-6666-666666666666
--   band    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa  (migration)
--   outcome cccccccc-cccc-cccc-cccc-cccccccccccc  (migration)
-- Intentionally empty: subjects, band_subjects, audit_log, lesson_progress, map_slices

-- ---------------------------------------------------------------------------
-- Tenant
-- ---------------------------------------------------------------------------
INSERT INTO schools (id, name, region, tier, licensed_band_range)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'School X (dev)',
  'Kathmandu',
  'pilot',
  'pre_primary'
);

INSERT INTO sections (id, school_id, band_id, grade, name)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'UKG',
  'UKG A'
);

-- ---------------------------------------------------------------------------
-- Identities (invited until pnpm seed:dev-auth activates admin/teacher)
-- ---------------------------------------------------------------------------
INSERT INTO identities (id, email, phone, account_status, invited_at) VALUES
  (
    '22222222-2222-2222-2222-222222222221',
    'admin@schoolx.dev',
    NULL,
    'invited',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'teacher@schoolx.dev',
    NULL,
    'invited',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    NULL,
    '9800000001',
    'invited',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222224',
    NULL,
    '9800000002',
    'invited',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222225',
    NULL,
    '9800000003',
    'invited',
    now()
  );

INSERT INTO school_memberships (id, identity_id, school_id, member_type, status) VALUES
  (
    '33333333-3333-3333-3333-333333333331',
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'admin',
    'active'
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'teacher',
    'active'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    'guardian',
    'active'
  ),
  (
    '33333333-3333-3333-3333-333333333334',
    '22222222-2222-2222-2222-222222222224',
    '11111111-1111-1111-1111-111111111111',
    'guardian',
    'active'
  );

INSERT INTO school_admins (id, membership_id, display_name) VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    '33333333-3333-3333-3333-333333333331',
    'School X Admin'
  );

INSERT INTO teachers (id, membership_id, display_name, certification_status) VALUES
  (
    '55555555-5555-5555-5555-555555555551',
    '33333333-3333-3333-3333-333333333332',
    'UKG A Class Teacher',
    'in_programme'
  );

INSERT INTO guardians (id, membership_id, relationship, language_pref) VALUES
  (
    '77777777-7777-7777-7777-777777777771',
    '33333333-3333-3333-3333-333333333333',
    'mother',
    'ne'
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    '33333333-3333-3333-3333-333333333334',
    'father',
    'ne'
  );

INSERT INTO children (id, section_id, name, roll_number, dob, status) VALUES
  (
    '88888888-8888-8888-8888-888888888881',
    '66666666-6666-6666-6666-666666666666',
    'Aarav Sharma',
    '1',
    '2020-03-15',
    'active'
  ),
  (
    '88888888-8888-8888-8888-888888888882',
    '66666666-6666-6666-6666-666666666666',
    'Priya Thapa',
    '2',
    '2020-07-22',
    'active'
  ),
  (
    '88888888-8888-8888-8888-888888888883',
    '66666666-6666-6666-6666-666666666666',
    'Kabir Gurung',
    '3',
    '2020-11-05',
    'active'
  );

INSERT INTO guardian_child_links (id, guardian_id, child_id, relationship) VALUES
  (
    '99999999-9999-9999-9999-999999999991',
    '77777777-7777-7777-7777-777777777771',
    '88888888-8888-8888-8888-888888888881',
    'mother'
  ),
  (
    '99999999-9999-9999-9999-999999999992',
    '77777777-7777-7777-7777-777777777772',
    '88888888-8888-8888-8888-888888888882',
    'father'
  ),
  (
    '99999999-9999-9999-9999-999999999993',
    '77777777-7777-7777-7777-777777777771',
    '88888888-8888-8888-8888-888888888883',
    'mother'
  );

INSERT INTO teacher_sections (id, teacher_id, section_id, subject_id, is_class_teacher)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1',
  '55555555-5555-5555-5555-555555555551',
  '66666666-6666-6666-6666-666666666666',
  NULL,
  true
);

-- ---------------------------------------------------------------------------
-- Calendar draft (not approved — wizard/API can still approve)
-- Session roughly Baisakh 2082 – Chaitra 2082 (AD approx)
-- ---------------------------------------------------------------------------
INSERT INTO school_calendars (
  id,
  school_id,
  academic_year_label,
  session_start,
  session_end,
  weekly_offs,
  approval_status
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  '2082',
  '2025-04-14',
  '2026-04-13',
  '{6}',
  'draft'
);

INSERT INTO terminals (
  id,
  school_calendar_id,
  name,
  sort_order,
  start_date,
  end_date,
  reporting_type
) VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Terminal 1',
    1,
    '2025-04-14',
    '2025-08-31',
    'formative'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Terminal 2',
    2,
    '2025-09-01',
    '2025-12-15',
    'formative'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Terminal 3',
    3,
    '2025-12-16',
    '2026-04-13',
    'transition'
  );

INSERT INTO calendar_closures (
  id,
  school_calendar_id,
  name,
  start_date,
  end_date,
  source
) VALUES
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbc1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Dashain',
    '2025-10-02',
    '2025-10-12',
    'festival_template'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbc2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Tihar',
    '2025-10-20',
    '2025-10-24',
    'festival_template'
  );

-- ---------------------------------------------------------------------------
-- Map stub (structural only — content placement is Phase 1)
-- ---------------------------------------------------------------------------
INSERT INTO yearly_map (id, school_calendar_id, section_id, subject_id, status)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '66666666-6666-6666-6666-666666666666',
  NULL,
  'draft'
);

-- ---------------------------------------------------------------------------
-- Pedagogy samples (proposed outcome only — never confirmed in seed)
-- ---------------------------------------------------------------------------
INSERT INTO attendance_record (id, child_id, section_id, day, status, recorded_by) VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    '88888888-8888-8888-8888-888888888881',
    '66666666-6666-6666-6666-666666666666',
    '2025-04-15',
    'present',
    '55555555-5555-5555-5555-555555555551'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
    '88888888-8888-8888-8888-888888888882',
    '66666666-6666-6666-6666-666666666666',
    '2025-04-15',
    'absent',
    '55555555-5555-5555-5555-555555555551'
  );

INSERT INTO student_outcomes (
  id,
  child_id,
  outcome_id,
  section_id,
  subject_id,
  band_code,
  rating_code,
  state,
  recorded_by,
  evidence_note
) VALUES (
  'ffffffff-ffff-ffff-ffff-fffffffffff1',
  '88888888-8888-8888-8888-888888888881',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '66666666-6666-6666-6666-666666666666',
  NULL,
  NULL,
  'emerging',
  'proposed',
  '55555555-5555-5555-5555-555555555551',
  'Seed sample — teacher must confirm before it is final'
);

-- ---------------------------------------------------------------------------
-- Substitute access examples (expired + future)
-- ---------------------------------------------------------------------------
INSERT INTO substitute_access (
  id,
  section_id,
  identity_id,
  granted_by,
  starts_at,
  expires_at
) VALUES
  (
    'aaaaaaaa-aaaa-bbbb-cccc-ddddddddddd1',
    '66666666-6666-6666-6666-666666666666',
    '22222222-2222-2222-2222-222222222225',
    '22222222-2222-2222-2222-222222222221',
    '2025-01-01T00:00:00Z',
    '2025-01-07T00:00:00Z'
  ),
  (
    'aaaaaaaa-aaaa-bbbb-cccc-ddddddddddd2',
    '66666666-6666-6666-6666-666666666666',
    '22222222-2222-2222-2222-222222222225',
    '22222222-2222-2222-2222-222222222221',
    '2026-12-01T00:00:00Z',
    '2026-12-15T00:00:00Z'
  );
