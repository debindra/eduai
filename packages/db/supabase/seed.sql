-- Local School X fixture — run via `supabase db reset`.
-- Passwords live in Supabase Auth only. After reset, run:
--   pnpm seed:dev-auth
-- Stable IDs (also referenced by scripts/seed-dev-auth.mjs):
--   school  11111111-1111-1111-1111-111111111111
--   section 66666666-6666-6666-6666-666666666666  (UKG A)
--   section 66666666-6666-6666-6666-666666666667  (Grade 1 A)
--   band    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa  (pre_primary, migration)
--   band    be000000-0000-0000-0000-000000000001  (basic_early, migration)
--   band    b4000000-0000-0000-0000-000000000001  (basic_upper, migration)
--   outcome cccccccc-cccc-cccc-cccc-cccccccccccc  (migration)
--   subjects d1111111-…111–117 (migration)
--   platform identity 22222222-2222-2222-2222-222222222260
--   platform_admin    a1000000-0000-0000-0000-000000000001
--   national_calendar a2000000-0000-0000-0000-000000000082 (BS 2082)
-- Full school: Nursery–Grade 5, ~120 children, 15 sections.
-- Intentionally empty: audit_log, lesson_progress, out_of_segment_query_log,
--   weekly_plan_overrides, lesson_drafts, parent_report_drafts, coach_messages,
--   document_render, handover_pack, remedial_plans, support_sessions.

-- ---------------------------------------------------------------------------
-- Tenant
-- ---------------------------------------------------------------------------
INSERT INTO schools (id, name, region, tier, licensed_band_range)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'School X (dev)',
  'Kathmandu',
  'pilot',
  'pre_primary,basic_early,basic_upper'
);

-- ---------------------------------------------------------------------------
-- Sections (15) — pre_primary / basic_early / basic_upper
-- ---------------------------------------------------------------------------
INSERT INTO sections (id, school_id, band_id, grade, name) VALUES
  -- pre_primary
  ('66666666-6666-6666-6666-666666666601', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nursery', 'Nursery A'),
  ('66666666-6666-6666-6666-666666666602', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nursery', 'Nursery B'),
  ('66666666-6666-6666-6666-666666666603', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nursery', 'Nursery C'),
  ('66666666-6666-6666-6666-666666666604', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'LKG', 'LKG A'),
  ('66666666-6666-6666-6666-666666666605', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'LKG', 'LKG B'),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'UKG', 'UKG A'),
  ('66666666-6666-6666-6666-666666666607', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'UKG', 'UKG B'),
  -- basic_early
  ('66666666-6666-6666-6666-666666666667', '11111111-1111-1111-1111-111111111111', 'be000000-0000-0000-0000-000000000001', 'Grade 1', 'Grade 1 A'),
  ('66666666-6666-6666-6666-666666666609', '11111111-1111-1111-1111-111111111111', 'be000000-0000-0000-0000-000000000001', 'Grade 1', 'Grade 1 B'),
  ('66666666-6666-6666-6666-666666666610', '11111111-1111-1111-1111-111111111111', 'be000000-0000-0000-0000-000000000001', 'Grade 2', 'Grade 2 A'),
  ('66666666-6666-6666-6666-666666666611', '11111111-1111-1111-1111-111111111111', 'be000000-0000-0000-0000-000000000001', 'Grade 2', 'Grade 2 B'),
  ('66666666-6666-6666-6666-666666666612', '11111111-1111-1111-1111-111111111111', 'be000000-0000-0000-0000-000000000001', 'Grade 3', 'Grade 3 A'),
  ('66666666-6666-6666-6666-666666666613', '11111111-1111-1111-1111-111111111111', 'be000000-0000-0000-0000-000000000001', 'Grade 3', 'Grade 3 B'),
  -- basic_upper
  ('66666666-6666-6666-6666-666666666614', '11111111-1111-1111-1111-111111111111', 'b4000000-0000-0000-0000-000000000001', 'Grade 4', 'Grade 4 A'),
  ('66666666-6666-6666-6666-666666666615', '11111111-1111-1111-1111-111111111111', 'b4000000-0000-0000-0000-000000000001', 'Grade 5', 'Grade 5 A');

-- ---------------------------------------------------------------------------
-- Identities (invited until pnpm seed:dev-auth activates admin/teacher)
-- ---------------------------------------------------------------------------
INSERT INTO identities (id, email, phone, account_status, invited_at) VALUES
  -- core / existing
  ('22222222-2222-2222-2222-222222222221', 'admin@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222222', 'teacher@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222223', NULL, '9800000001', 'invited', now()),
  ('22222222-2222-2222-2222-222222222224', NULL, '9800000002', 'invited', now()),
  ('22222222-2222-2222-2222-222222222225', NULL, '9800000003', 'invited', now()),
  ('22222222-2222-2222-2222-222222222226', 'math@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222227', 'english@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222228', 'classteacher-g1@schoolx.dev', NULL, 'invited', now()),
  -- class teachers (new)
  ('22222222-2222-2222-2222-222222222229', 'nursery-a@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222230', 'nursery-b@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222231', 'nursery-c@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222232', 'lkg-a@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222233', 'lkg-b@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222234', 'ukg-b@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222235', 'g1-b@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222236', 'g2-a@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222237', 'g2-b@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222238', 'g3-a@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222239', 'g3-b@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222240', 'g4-a@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222241', 'g5-a@schoolx.dev', NULL, 'invited', now()),
  -- basic_early subject teachers (nepali/science/social; math+english already above)
  ('22222222-2222-2222-2222-222222222242', 'nepali-early@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222243', 'science-early@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222244', 'social-early@schoolx.dev', NULL, 'invited', now()),
  -- basic_upper subject teachers
  ('22222222-2222-2222-2222-222222222245', 'nepali-upper@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222246', 'english-upper@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222247', 'math-upper@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222248', 'science-upper@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222249', 'social-upper@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222250', 'health-upper@schoolx.dev', NULL, 'invited', now()),
  ('22222222-2222-2222-2222-222222222251', 'local-upper@schoolx.dev', NULL, 'invited', now()),
  -- platform super admin (no school_memberships — cross-tenant axis)
  ('22222222-2222-2222-2222-222222222260', 'platform@eduai.dev', NULL, 'invited', now());

INSERT INTO platform_admins (id, identity_id, display_name, status) VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222260',
    'Platform Admin (dev)',
    'active'
  );

INSERT INTO school_memberships (id, identity_id, school_id, member_type, status) VALUES
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'admin', 'active'),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'guardian', 'active'),
  ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'guardian', 'active'),
  ('33333333-3333-3333-3333-333333333336', '22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333337', '22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333338', '22222222-2222-2222-2222-222222222228', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333339', '22222222-2222-2222-2222-222222222229', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333340', '22222222-2222-2222-2222-222222222230', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333341', '22222222-2222-2222-2222-222222222231', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333342', '22222222-2222-2222-2222-222222222232', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333343', '22222222-2222-2222-2222-222222222233', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333344', '22222222-2222-2222-2222-222222222234', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333345', '22222222-2222-2222-2222-222222222235', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333346', '22222222-2222-2222-2222-222222222236', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333347', '22222222-2222-2222-2222-222222222237', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333348', '22222222-2222-2222-2222-222222222238', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333349', '22222222-2222-2222-2222-222222222239', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333350', '22222222-2222-2222-2222-222222222240', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333351', '22222222-2222-2222-2222-222222222241', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333352', '22222222-2222-2222-2222-222222222242', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333353', '22222222-2222-2222-2222-222222222243', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333354', '22222222-2222-2222-2222-222222222244', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333355', '22222222-2222-2222-2222-222222222245', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333356', '22222222-2222-2222-2222-222222222246', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333357', '22222222-2222-2222-2222-222222222247', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333358', '22222222-2222-2222-2222-222222222248', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333359', '22222222-2222-2222-2222-222222222249', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333360', '22222222-2222-2222-2222-222222222250', '11111111-1111-1111-1111-111111111111', 'teacher', 'active'),
  ('33333333-3333-3333-3333-333333333361', '22222222-2222-2222-2222-222222222251', '11111111-1111-1111-1111-111111111111', 'teacher', 'active');

INSERT INTO school_admins (id, membership_id, display_name) VALUES
  ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', 'School X Admin');

INSERT INTO teachers (id, membership_id, display_name, certification_status) VALUES
  -- existing stable IDs (certification references 551)
  ('55555555-5555-5555-5555-555555555551', '33333333-3333-3333-3333-333333333332', 'UKG A Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555552', '33333333-3333-3333-3333-333333333336', 'Basic Early Math Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555553', '33333333-3333-3333-3333-333333333337', 'Basic Early English Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555554', '33333333-3333-3333-3333-333333333338', 'Grade 1 A Class Teacher', 'in_programme'),
  -- class teachers
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333339', 'Nursery A Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555556', '33333333-3333-3333-3333-333333333340', 'Nursery B Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555557', '33333333-3333-3333-3333-333333333341', 'Nursery C Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555558', '33333333-3333-3333-3333-333333333342', 'LKG A Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555559', '33333333-3333-3333-3333-333333333343', 'LKG B Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555560', '33333333-3333-3333-3333-333333333344', 'UKG B Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555561', '33333333-3333-3333-3333-333333333345', 'Grade 1 B Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555562', '33333333-3333-3333-3333-333333333346', 'Grade 2 A Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555563', '33333333-3333-3333-3333-333333333347', 'Grade 2 B Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555564', '33333333-3333-3333-3333-333333333348', 'Grade 3 A Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555565', '33333333-3333-3333-3333-333333333349', 'Grade 3 B Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555566', '33333333-3333-3333-3333-333333333350', 'Grade 4 A Class Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555567', '33333333-3333-3333-3333-333333333351', 'Grade 5 A Class Teacher', 'in_programme'),
  -- basic_early subject
  ('55555555-5555-5555-5555-555555555568', '33333333-3333-3333-3333-333333333352', 'Basic Early Nepali Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555569', '33333333-3333-3333-3333-333333333353', 'Basic Early Science Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555570', '33333333-3333-3333-3333-333333333354', 'Basic Early Social Teacher', 'in_programme'),
  -- basic_upper subject
  ('55555555-5555-5555-5555-555555555571', '33333333-3333-3333-3333-333333333355', 'Basic Upper Nepali Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555572', '33333333-3333-3333-3333-333333333356', 'Basic Upper English Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555573', '33333333-3333-3333-3333-333333333357', 'Basic Upper Math Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555574', '33333333-3333-3333-3333-333333333358', 'Basic Upper Science Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555575', '33333333-3333-3333-3333-333333333359', 'Basic Upper Social Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555576', '33333333-3333-3333-3333-333333333360', 'Basic Upper Health & PE Teacher', 'in_programme'),
  ('55555555-5555-5555-5555-555555555577', '33333333-3333-3333-3333-333333333361', 'Basic Upper Local Subject Teacher', 'in_programme');

INSERT INTO guardians (id, membership_id, relationship, language_pref) VALUES
  ('77777777-7777-7777-7777-777777777771', '33333333-3333-3333-3333-333333333333', 'mother', 'ne'),
  ('77777777-7777-7777-7777-777777777772', '33333333-3333-3333-3333-333333333334', 'father', 'ne');

-- ---------------------------------------------------------------------------
-- Anchor children (stable IDs used by attendance / outcomes / guardian links)
-- ---------------------------------------------------------------------------
INSERT INTO children (id, section_id, name, roll_number, dob, status) VALUES
  ('88888888-8888-8888-8888-888888888881', '66666666-6666-6666-6666-666666666666', 'Aarav Sharma', '1', '2020-03-15', 'active'),
  ('88888888-8888-8888-8888-888888888882', '66666666-6666-6666-6666-666666666666', 'Priya Thapa', '2', '2020-07-22', 'active'),
  ('88888888-8888-8888-8888-888888888883', '66666666-6666-6666-6666-666666666666', 'Kabir Gurung', '3', '2020-11-05', 'active'),
  ('88888888-8888-8888-8888-888888888884', '66666666-6666-6666-6666-666666666667', 'Nisha Rai', '1', '2019-05-10', 'active'),
  ('88888888-8888-8888-8888-888888888885', '66666666-6666-6666-6666-666666666667', 'Rohan Magar', '2', '2019-08-18', 'active');

INSERT INTO guardian_child_links (id, guardian_id, child_id, relationship) VALUES
  ('99999999-9999-9999-9999-999999999991', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', 'mother'),
  ('99999999-9999-9999-9999-999999999992', '77777777-7777-7777-7777-777777777772', '88888888-8888-8888-8888-888888888882', 'father'),
  ('99999999-9999-9999-9999-999999999993', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888883', 'mother'),
  ('99999999-9999-9999-9999-999999999994', '77777777-7777-7777-7777-777777777772', '88888888-8888-8888-8888-888888888884', 'father');

-- ---------------------------------------------------------------------------
-- Fill remaining children (~120 total) via DO block
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  names text[] := ARRAY[
    'Anisha Karki', 'Bikash Adhikari', 'Chhaya Basnet', 'Dipesh Khadka',
    'Esha Tamang', 'Firoj Shrestha', 'Gita Pandey', 'Hari Bhandari',
    'Isha Maharjan', 'Jeevan Koirala', 'Kriti Lama', 'Laxman Poudel',
    'Manisha Dahal', 'Nabin Joshi', 'Omkar Rana', 'Pooja Acharya',
    'Qasim Sheikh', 'Rita Subedi', 'Sajan Bhattarai', 'Tenzin Sherpa',
    'Usha Neupane', 'Vivek Sapkota', 'Woma Rai', 'Yash GC',
    'Zoya Khan', 'Aayush Dhakal', 'Bina Gautam', 'Chirag Limbu',
    'Diya Ojha', 'Eshan Pathak', 'Farah Ansari', 'Gopal Regmi',
    'Hima Kunwar', 'Ishan Devkota', 'Juhi Chaudhary', 'Karan Thakuri',
    'Lina Bista', 'Milan Katuwal', 'Nina Parajuli', 'Oscar Shahi'
  ];
  section_targets uuid[] := ARRAY[
    '66666666-6666-6666-6666-666666666601'::uuid, -- Nursery A 8
    '66666666-6666-6666-6666-666666666602'::uuid, -- Nursery B 8
    '66666666-6666-6666-6666-666666666603'::uuid, -- Nursery C 7
    '66666666-6666-6666-6666-666666666604'::uuid, -- LKG A 8
    '66666666-6666-6666-6666-666666666605'::uuid, -- LKG B 8
    '66666666-6666-6666-6666-666666666666'::uuid, -- UKG A 8 (3 exist)
    '66666666-6666-6666-6666-666666666607'::uuid, -- UKG B 7
    '66666666-6666-6666-6666-666666666667'::uuid, -- G1 A 8 (2 exist)
    '66666666-6666-6666-6666-666666666609'::uuid, -- G1 B 7
    '66666666-6666-6666-6666-666666666610'::uuid, -- G2 A 8
    '66666666-6666-6666-6666-666666666611'::uuid, -- G2 B 7
    '66666666-6666-6666-6666-666666666612'::uuid, -- G3 A 8
    '66666666-6666-6666-6666-666666666613'::uuid, -- G3 B 6
    '66666666-6666-6666-6666-666666666614'::uuid, -- G4 A 12
    '66666666-6666-6666-6666-666666666615'::uuid  -- G5 A 10
  ];
  targets int[] := ARRAY[8, 8, 7, 8, 8, 8, 7, 8, 7, 8, 7, 8, 6, 12, 10];
  dobs date[] := ARRAY[
    '2021-04-01'::date, '2021-02-15'::date, '2021-06-20'::date, -- Nursery
    '2020-05-10'::date, '2020-08-12'::date, -- LKG
    '2019-09-01'::date, '2019-11-11'::date, -- UKG
    '2018-06-01'::date, '2018-07-07'::date, -- G1
    '2017-05-05'::date, '2017-08-18'::date, -- G2
    '2016-04-14'::date, '2016-09-09'::date, -- G3
    '2015-03-03'::date, -- G4
    '2014-01-20'::date  -- G5
  ];
  i int;
  j int;
  existing int;
  need int;
  name_idx int := 1;
  sec uuid;
  base_dob date;
BEGIN
  FOR i IN 1..array_length(section_targets, 1) LOOP
    sec := section_targets[i];
    SELECT COUNT(*)::int INTO existing FROM children WHERE section_id = sec;
    need := targets[i] - existing;
    base_dob := dobs[LEAST(i, array_length(dobs, 1))];
    FOR j IN 1..need LOOP
      INSERT INTO children (section_id, name, roll_number, dob, status)
      VALUES (
        sec,
        names[((name_idx - 1) % array_length(names, 1)) + 1],
        (existing + j)::text,
        base_dob + ((j % 28) || ' days')::interval,
        'active'
      );
      name_idx := name_idx + 1;
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- teacher_sections: class teachers + band-level subject teachers
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  class_pairs record;
  early_sections uuid[] := ARRAY[
    '66666666-6666-6666-6666-666666666667'::uuid,
    '66666666-6666-6666-6666-666666666609'::uuid,
    '66666666-6666-6666-6666-666666666610'::uuid,
    '66666666-6666-6666-6666-666666666611'::uuid,
    '66666666-6666-6666-6666-666666666612'::uuid,
    '66666666-6666-6666-6666-666666666613'::uuid
  ];
  upper_sections uuid[] := ARRAY[
    '66666666-6666-6666-6666-666666666614'::uuid,
    '66666666-6666-6666-6666-666666666615'::uuid
  ];
  early_subjects uuid[] := ARRAY[
    'd1111111-1111-1111-1111-111111111111'::uuid, -- nepali
    'd1111111-1111-1111-1111-111111111112'::uuid, -- english
    'd1111111-1111-1111-1111-111111111113'::uuid, -- math
    'd1111111-1111-1111-1111-111111111114'::uuid, -- science
    'd1111111-1111-1111-1111-111111111115'::uuid  -- social
  ];
  early_teachers uuid[] := ARRAY[
    '55555555-5555-5555-5555-555555555568'::uuid, -- nepali
    '55555555-5555-5555-5555-555555555553'::uuid, -- english (existing)
    '55555555-5555-5555-5555-555555555552'::uuid, -- math (existing)
    '55555555-5555-5555-5555-555555555569'::uuid, -- science
    '55555555-5555-5555-5555-555555555570'::uuid  -- social
  ];
  upper_subjects uuid[] := ARRAY[
    'd1111111-1111-1111-1111-111111111111'::uuid,
    'd1111111-1111-1111-1111-111111111112'::uuid,
    'd1111111-1111-1111-1111-111111111113'::uuid,
    'd1111111-1111-1111-1111-111111111114'::uuid,
    'd1111111-1111-1111-1111-111111111115'::uuid,
    'd1111111-1111-1111-1111-111111111116'::uuid,
    'd1111111-1111-1111-1111-111111111117'::uuid
  ];
  upper_teachers uuid[] := ARRAY[
    '55555555-5555-5555-5555-555555555571'::uuid,
    '55555555-5555-5555-5555-555555555572'::uuid,
    '55555555-5555-5555-5555-555555555573'::uuid,
    '55555555-5555-5555-5555-555555555574'::uuid,
    '55555555-5555-5555-5555-555555555575'::uuid,
    '55555555-5555-5555-5555-555555555576'::uuid,
    '55555555-5555-5555-5555-555555555577'::uuid
  ];
  i int;
  j int;
BEGIN
  -- Class teachers (subject_id NULL, is_class_teacher true)
  FOR class_pairs IN
    SELECT * FROM (VALUES
      ('55555555-5555-5555-5555-555555555555'::uuid, '66666666-6666-6666-6666-666666666601'::uuid),
      ('55555555-5555-5555-5555-555555555556'::uuid, '66666666-6666-6666-6666-666666666602'::uuid),
      ('55555555-5555-5555-5555-555555555557'::uuid, '66666666-6666-6666-6666-666666666603'::uuid),
      ('55555555-5555-5555-5555-555555555558'::uuid, '66666666-6666-6666-6666-666666666604'::uuid),
      ('55555555-5555-5555-5555-555555555559'::uuid, '66666666-6666-6666-6666-666666666605'::uuid),
      ('55555555-5555-5555-5555-555555555551'::uuid, '66666666-6666-6666-6666-666666666666'::uuid),
      ('55555555-5555-5555-5555-555555555560'::uuid, '66666666-6666-6666-6666-666666666607'::uuid),
      ('55555555-5555-5555-5555-555555555554'::uuid, '66666666-6666-6666-6666-666666666667'::uuid),
      ('55555555-5555-5555-5555-555555555561'::uuid, '66666666-6666-6666-6666-666666666609'::uuid),
      ('55555555-5555-5555-5555-555555555562'::uuid, '66666666-6666-6666-6666-666666666610'::uuid),
      ('55555555-5555-5555-5555-555555555563'::uuid, '66666666-6666-6666-6666-666666666611'::uuid),
      ('55555555-5555-5555-5555-555555555564'::uuid, '66666666-6666-6666-6666-666666666612'::uuid),
      ('55555555-5555-5555-5555-555555555565'::uuid, '66666666-6666-6666-6666-666666666613'::uuid),
      ('55555555-5555-5555-5555-555555555566'::uuid, '66666666-6666-6666-6666-666666666614'::uuid),
      ('55555555-5555-5555-5555-555555555567'::uuid, '66666666-6666-6666-6666-666666666615'::uuid)
    ) AS t(teacher_id, section_id)
  LOOP
    INSERT INTO teacher_sections (teacher_id, section_id, subject_id, is_class_teacher)
    VALUES (class_pairs.teacher_id, class_pairs.section_id, NULL, true);
  END LOOP;

  -- basic_early subject teachers × all G1–3 sections
  FOR i IN 1..array_length(early_teachers, 1) LOOP
    FOR j IN 1..array_length(early_sections, 1) LOOP
      INSERT INTO teacher_sections (teacher_id, section_id, subject_id, is_class_teacher)
      VALUES (early_teachers[i], early_sections[j], early_subjects[i], false);
    END LOOP;
  END LOOP;

  -- basic_upper subject teachers × G4–5 sections
  FOR i IN 1..array_length(upper_teachers, 1) LOOP
    FOR j IN 1..array_length(upper_sections, 1) LOOP
      INSERT INTO teacher_sections (teacher_id, section_id, subject_id, is_class_teacher)
      VALUES (upper_teachers[i], upper_sections[j], upper_subjects[i], false);
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Calendar approved (teaching_days VIEW reads approved only — draft yields
-- zero days and map_slices seed would be empty). Session roughly Baisakh
-- 2082 – Chaitra 2082 (AD approx). Admins can still clone a draft via ensure-draft.
-- ---------------------------------------------------------------------------
INSERT INTO school_calendars (
  id,
  school_id,
  academic_year_label,
  session_start,
  session_end,
  weekly_offs,
  approval_status,
  approved_at,
  approved_by
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  '2082',
  '2025-04-14',
  '2026-04-13',
  '{6}',
  'approved',
  now(),
  '22222222-2222-2222-2222-222222222221'
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
-- National calendar (published BS 2082) — data rows, not app hardcodes.
-- Dashain/Tihar overlap school festival_template dates (no extra teaching-day
-- loss). Fixed govt holiday lands on Saturday (weekly off) so map_slices
-- still equals teaching_days after VIEW extension.
-- ---------------------------------------------------------------------------
INSERT INTO national_calendars (id, bs_year, status) VALUES
  ('a2000000-0000-0000-0000-000000000082', 2082, 'published');

INSERT INTO national_closures (
  id,
  national_calendar_id,
  name,
  category,
  start_date,
  end_date,
  bs_label,
  movable
) VALUES
  (
    'a2000000-0000-0000-0000-0000000000c1',
    'a2000000-0000-0000-0000-000000000082',
    'Dashain',
    'festival',
    '2025-10-02',
    '2025-10-12',
    'Ashwin 2082',
    true
  ),
  (
    'a2000000-0000-0000-0000-0000000000c2',
    'a2000000-0000-0000-0000-000000000082',
    'Tihar',
    'festival',
    '2025-10-20',
    '2025-10-24',
    'Kartik 2082',
    true
  ),
  (
    'a2000000-0000-0000-0000-0000000000c3',
    'a2000000-0000-0000-0000-000000000082',
    'Representative Day Off (seed)',
    'govt_holiday',
    '2025-04-19',
    '2025-04-19',
    'Baisakh 6, 2082',
    false
  );

-- ---------------------------------------------------------------------------
-- Phase 8 — global ECA/CCA catalog + School X enables a subset
-- ---------------------------------------------------------------------------
INSERT INTO eca_cca_catalog (id, name, kind, icon_key, sort_order, is_active) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'Sports Day', 'eca', 'sports', 10, true),
  ('a3000000-0000-0000-0000-000000000002', 'Music Club', 'cca', 'music', 20, true),
  ('a3000000-0000-0000-0000-000000000003', 'Art & Craft', 'cca', 'art', 30, true),
  ('a3000000-0000-0000-0000-000000000004', 'Dance', 'eca', 'dance', 40, true),
  ('a3000000-0000-0000-0000-000000000005', 'Drama / Theatre', 'cca', 'drama', 50, true),
  ('a3000000-0000-0000-0000-000000000006', 'Scouts / Guides', 'eca', 'scout', 60, true),
  ('a3000000-0000-0000-0000-000000000007', 'Debate', 'cca', 'debate', 70, true),
  ('a3000000-0000-0000-0000-000000000008', 'Science Club', 'cca', 'science', 80, true),
  ('a3000000-0000-0000-0000-000000000009', 'Computer Club', 'cca', 'computer', 90, true),
  ('a3000000-0000-0000-0000-00000000000a', 'Yoga', 'eca', 'yoga', 100, true),
  ('a3000000-0000-0000-0000-00000000000b', 'Gardening', 'eca', 'gardening', 110, true),
  ('a3000000-0000-0000-0000-00000000000c', 'Library Hour', 'cca', 'library', 120, true);

INSERT INTO school_eca_cca_items (id, school_id, catalog_id, is_active) VALUES
  (
    'a3100000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'a3000000-0000-0000-0000-000000000001',
    true
  ),
  (
    'a3100000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'a3000000-0000-0000-0000-000000000002',
    true
  ),
  (
    'a3100000-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'a3000000-0000-0000-0000-000000000003',
    true
  );

-- School-only example (not in global catalog)
INSERT INTO school_eca_cca_items (
  id, school_id, catalog_id, name, kind, icon_key, is_active
) VALUES (
  'a3100000-0000-0000-0000-0000000000f1',
  '11111111-1111-1111-1111-111111111111',
  NULL,
  'House Competition',
  'eca',
  'sports',
  true
);

-- ---------------------------------------------------------------------------
-- Extra pre-primary placeholder outcomes (trainer bank later)
-- ---------------------------------------------------------------------------
INSERT INTO outcomes (id, band_id, subject_id, code, framework, statement_en, statement_np, sort_order)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-SELF-001', 'milestone', 'Shows awareness of self and family roles', 'placeholder', 2),
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-SCHOOL-001', 'milestone', 'Participates in classroom routines', 'placeholder', 3),
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-ANIMAL-001', 'milestone', 'Names familiar animals and their needs', 'placeholder', 4),
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-PLANT-001', 'milestone', 'Observes plants and describes growth', 'placeholder', 5),
  ('cccccccc-cccc-cccc-cccc-cccccccccc05', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-FOOD-001', 'milestone', 'Sorts foods and talks about healthy choices', 'placeholder', 6),
  ('cccccccc-cccc-cccc-cccc-cccccccccc06', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-WEATHER-001', 'milestone', 'Describes weather and seasonal changes', 'placeholder', 7),
  ('cccccccc-cccc-cccc-cccc-cccccccccc07', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-COMMUNITY-001', 'milestone', 'Recognises community helpers', 'placeholder', 8),
  ('cccccccc-cccc-cccc-cccc-cccccccccc08', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-TRANSPORT-001', 'milestone', 'Identifies common forms of transport', 'placeholder', 9),
  ('cccccccc-cccc-cccc-cccc-cccccccccc09', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-NUMBER-001', 'milestone', 'Counts and patterns with concrete objects', 'placeholder', 10),
  ('cccccccc-cccc-cccc-cccc-cccccccccc0a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-LETTER-001', 'milestone', 'Recognises letters and beginning sounds', 'placeholder', 11),
  ('cccccccc-cccc-cccc-cccc-cccccccccc0b', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PP-STORY-001', 'milestone', 'Retells a familiar story or song', 'placeholder', 12);

-- ---------------------------------------------------------------------------
-- Prompts #1, #2, #4 × pre_primary (from prompts/ai-prompt-templates.md)
-- ---------------------------------------------------------------------------
INSERT INTO prompts (id, feature_id, band_id, model_tier, system_template, validator_keys)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    'outcome_mapper',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'haiku',
    $prompt$You convert a teacher's brief classroom observation into a candidate milestone and a suggested band. You never finalize anything — a human teacher confirms or edits every proposal you produce.

Rules you must follow exactly:
1. Never propose the top band/rating ("can_do") from a single sighting alone unless the observation itself describes mastery unambiguously repeated or unmistakably independent.
2. If the child's name is ambiguous within this section, do not guess — return candidate roll numbers for the teacher to pick from.
3. If the text is a non-observation (e.g. "absent today", "sick", "left early"), do not propose any outcome/milestone. Flag it as attendance-related instead.
4. Never infer across subject/domain boundaries.
5. Output only a structured proposal object. Never write directly to any record.

Active milestones for this class/period: {{outcomes_json}}
Observation: {{observation_text}}$prompt$,
    ARRAY['mapper_guards', 'no_label_no_rank']
  ),
  (
    'a1111111-1111-1111-1111-111111111112',
    'classroom_coach',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'haiku',
    $prompt$You are a quiet, practical coaching voice for a pre-primary teacher in Nepal, mid-classroom. She has seconds, not minutes.

- Answer in three short parts: what to do right now, why it happens at this age (one sentence), how to make it rarer going forward.
- Never write anything that could be interpreted as a diagnosis or a condition name.
- This conversation is private: never reference or imply that it will be visible to an admin or written to the child's file.
- If the message describes a safety concern (possible harm to a child), do not coach — respond with the safeguarding escalation path instead.

Teacher's message: {{message_text}}$prompt$,
    ARRAY['no_label_no_rank', 'safeguarding_precheck']
  ),
  (
    'a1111111-1111-1111-1111-111111111114',
    'lesson_generator',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'haiku',
    $prompt$Generate today's lesson plan for this class, grounded in the book position and active outcomes below. Do not invent content outside this scope.

map_slice: {{map_slice_json}}
band: {{band_id}}
teacher_experience_signal: {{teacher_experience_signal}}

Pedagogy selection (decided by content type, not by you):
- Concept/thematic content → 5E inquiry structure.
- Systematic/procedural skills (letters, number formation, phonics) → explicit, structured instruction.

Output: objective, expected outcome, materials, staged flow, observation rubric.
Never reference a test, exam, or scored assessment.$prompt$,
    ARRAY['grounded_in_slice', 'no_test_language']
  ),
  (
    'a1111111-1111-1111-1111-111111111115',
    'monthly_parent_report',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'sonnet',
    $prompt$Draft a short parent report in {{report_language}}, about ~150 words, strictly from the evidence provided. Teacher will approve before it reaches the parent.

Shape: celebration first, at most two growing items, three home activities, warm invitation to reply.
No marks, ranks, comparisons, personality adjectives, or diagnostic language.
If evidence is too thin, return a thin-data flag instead of inventing content.

Evidence: {{evidence_json}}$prompt$,
    ARRAY['evidence_grounded', 'no_label_no_rank', 'thin_data_fallback']
  );

-- ---------------------------------------------------------------------------
-- Yearly map + deterministic theme placement across teaching days (UKG A only)
-- ---------------------------------------------------------------------------
INSERT INTO yearly_map (id, school_calendar_id, section_id, subject_id, status)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '66666666-6666-6666-6666-666666666666',
  NULL,
  'draft'
);

-- Theme sequence (weights relative). Last theme reserved for consolidation window.
DO $$
DECLARE
  themes text[] := ARRAY[
    'Myself and my family',
    'My school',
    'Animals around us',
    'Plants and gardens',
    'Food we eat',
    'Weather and seasons',
    'Community helpers',
    'Transport',
    'Numbers and patterns',
    'Letters and sounds',
    'Stories and songs',
    'Consolidation'
  ];
  outcome_ids uuid[] := ARRAY[
    'cccccccc-cccc-cccc-cccc-cccccccccc01'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc02'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc03'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc04'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc05'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc06'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc07'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc08'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc09'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc0a'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc0b'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid
  ];
  term record;
  day_rec record;
  day_count int;
  consol_days int;
  content_days int;
  theme_idx int;
  slice_id uuid;
  theme_name text;
  outcome_id uuid;
BEGIN
  FOR term IN
    SELECT id AS terminal_id
    FROM terminals
    WHERE school_calendar_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    ORDER BY sort_order
  LOOP
    SELECT COUNT(*)::int INTO day_count
    FROM teaching_days
    WHERE terminal_id = term.terminal_id;

    consol_days := GREATEST(3, LEAST(7, (day_count * 10) / 100));
    content_days := GREATEST(0, day_count - consol_days);

    FOR day_rec IN
      SELECT day_index
      FROM teaching_days
      WHERE terminal_id = term.terminal_id
      ORDER BY day_index
    LOOP
      IF day_rec.day_index > content_days THEN
        theme_idx := 12;
      ELSIF content_days = 0 THEN
        theme_idx := 12;
      ELSE
        theme_idx := LEAST(11, 1 + ((day_rec.day_index - 1) * 11) / content_days);
      END IF;

      theme_name := themes[theme_idx];
      outcome_id := outcome_ids[theme_idx];
      slice_id := gen_random_uuid();

      INSERT INTO map_slices (
        id, yearly_map_id, terminal_id, teaching_day_index, theme_or_chapter, outcome_refs
      ) VALUES (
        slice_id,
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        term.terminal_id,
        day_rec.day_index,
        theme_name,
        ARRAY[outcome_id]
      );

      INSERT INTO map_slice_outcomes (map_slice_id, outcome_id)
      VALUES (slice_id, outcome_id);
    END LOOP;
  END LOOP;
END $$;

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
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3',
    '88888888-8888-8888-8888-888888888884',
    '66666666-6666-6666-6666-666666666667',
    '2025-04-15',
    'present',
    '55555555-5555-5555-5555-555555555554'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4',
    '88888888-8888-8888-8888-888888888885',
    '66666666-6666-6666-6666-666666666667',
    '2025-04-15',
    'late',
    '55555555-5555-5555-5555-555555555554'
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
) VALUES
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff1',
    '88888888-8888-8888-8888-888888888881',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '66666666-6666-6666-6666-666666666666',
    NULL,
    NULL,
    'not_yet',
    'proposed',
    '55555555-5555-5555-5555-555555555551',
    'Seed sample — teacher must confirm before it is final'
  ),
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff2',
    '88888888-8888-8888-8888-888888888884',
    'c3333333-3333-3333-3333-333333333303',
    '66666666-6666-6666-6666-666666666667',
    'd1111111-1111-1111-1111-111111111113',
    NULL,
    '2',
    'proposed',
    '55555555-5555-5555-5555-555555555552',
    'Seed sample Grade 1 math — proposed only'
  ),
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff3',
    '88888888-8888-8888-8888-888888888885',
    'c3333333-3333-3333-3333-333333333302',
    '66666666-6666-6666-6666-666666666667',
    'd1111111-1111-1111-1111-111111111112',
    NULL,
    '1',
    'proposed',
    '55555555-5555-5555-5555-555555555553',
    'Seed sample Grade 1 English — proposed only'
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

-- ---------------------------------------------------------------------------
-- Phase 2: settling programme + catch-up / parent-reply prompts
-- ---------------------------------------------------------------------------
INSERT INTO settling_programme_steps (id, band_id, week_number, title, body) VALUES
  (
    'b2222222-2222-2222-2222-222222222201',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    1,
    'Welcome and routines',
    'Establish morning greeting, bag place, and toilet routine. Keep days short and predictable.'
  ),
  (
    'b2222222-2222-2222-2222-222222222202',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    2,
    'Separation support',
    'Offer a brief goodbye ritual. Share one positive observation with the guardian after day one.'
  ),
  (
    'b2222222-2222-2222-2222-222222222203',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    3,
    'Peer play',
    'Pair children for short parallel-play moments. Do not force sharing in week three.'
  ),
  (
    'b2222222-2222-2222-2222-222222222204',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    4,
    'Settle check-in',
    'Review who is still unsettled. Adjust seating and arrival support. Keep records observational only.'
  );

INSERT INTO prompts (id, feature_id, band_id, model_tier, system_template, validator_keys)
VALUES
  (
    'a1111111-1111-1111-1111-111111111121',
    'catch_up_reteach',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'haiku',
    $prompt$You write short re-teach moments for a child who missed classroom days. Ground every suggestion in the missed themes listed below. Screen-free home activities only. Never invent milestones or ratings. Write child-agnostically (no names) — the teacher adapts it for the specific child at delivery.

Missed themes: {{missed_themes}}$prompt$,
    ARRAY['no_label_no_rank', 'no_test_language']
  ),
  (
    'a1111111-1111-1111-1111-111111111122',
    'parent_reply_draft',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'haiku',
    $prompt$Draft a short, warm WhatsApp reply a pre-primary teacher can send to a guardian. Never invent observations. Never diagnose. Never compare children. Keep under 80 words. Output draft text only.

Guardian message: {{guardian_message}}$prompt$,
    ARRAY['no_label_no_rank']
  );

-- ---------------------------------------------------------------------------
-- Phase 3: methods-toolkit / remedial prompts (band-as-data)
-- ---------------------------------------------------------------------------
INSERT INTO prompts (id, feature_id, band_id, model_tier, system_template, validator_keys)
VALUES
  (
    'a1111111-1111-1111-1111-111111111131',
    'methods_toolkit',
    'be000000-0000-0000-0000-000000000001',
    'haiku',
    $prompt$Generate a short remedial activity for Grades 1–3. Keep it classroom-practical, low-resource, and screen-free. Never invent outcome ratings. Never diagnose. Generation parity: same quality regardless of school tier. Write the activity child-agnostically (no names) — the teacher adapts it for the specific child at delivery.

Activity type: {{activity_type}}
Outcome: {{outcome_statement}}$prompt$,
    ARRAY['no_label_no_rank', 'no_test_language']
  ),
  (
    'a1111111-1111-1111-1111-111111111132',
    'outcome_mapper',
    'be000000-0000-0000-0000-000000000001',
    'haiku',
    $prompt$You convert a teacher's brief classroom observation into a candidate CDC outcome rating (1–4). You never finalize anything — a human teacher confirms or edits every proposal.

Rules:
1. Never propose rating 4 from a single sighting alone.
2. Ambiguous names → return roll-number candidates, never guess.
3. Non-observations (absent/sick) → attendance route, not an outcome.
4. Never infer across subject boundaries.
5. Output only a structured proposal object.

Active outcomes: {{outcomes_json}}
Observation: {{observation_text}}$prompt$,
    ARRAY['mapper_guards', 'no_label_no_rank']
  );

-- ---------------------------------------------------------------------------
-- message_log: representative family WhatsApp thread (Aarav / mother)
-- Fees/complaints route to admin — never teacher — so sample stays attendance+faq.
-- ---------------------------------------------------------------------------
INSERT INTO message_log (
  id,
  school_id,
  child_id,
  guardian_id,
  thread_id,
  direction,
  channel,
  intent_route,
  content_ref,
  draft_reply,
  approval_status
) VALUES
  (
    'a1111111-1111-1111-1111-111111111201',
    '11111111-1111-1111-1111-111111111111',
    '88888888-8888-8888-8888-888888888881',
    '77777777-7777-7777-7777-777777777771',
    'wa-thread-aarav-001',
    'inbound',
    'whatsapp',
    'attendance',
    'wa:inbound:aarav-absent-2025-04-15',
    NULL,
    'sent'
  ),
  (
    'a1111111-1111-1111-1111-111111111202',
    '11111111-1111-1111-1111-111111111111',
    '88888888-8888-8888-8888-888888888881',
    '77777777-7777-7777-7777-777777777771',
    'wa-thread-aarav-001',
    'outbound',
    'whatsapp',
    'attendance',
    'wa:outbound:aarav-absent-ack-2025-04-15',
    'Namaste — thank you for letting us know. We have marked Aarav absent today. Feel better soon.',
    'sent'
  ),
  (
    'a1111111-1111-1111-1111-111111111203',
    '11111111-1111-1111-1111-111111111111',
    '88888888-8888-8888-8888-888888888881',
    '77777777-7777-7777-7777-777777777771',
    'wa-thread-aarav-001',
    'inbound',
    'whatsapp',
    'faq',
    'wa:inbound:aarav-pick-time-faq',
    NULL,
    'sent'
  );

-- ---------------------------------------------------------------------------
-- Phase 5: certification progress for the UKG class teacher (weeks 1–3 passed)
-- out_of_segment_query_log intentionally empty (demand signal accrues in prod).
-- ---------------------------------------------------------------------------
INSERT INTO certification_progress (teacher_id, week, status, quiz_score) VALUES
  ('55555555-5555-5555-5555-555555555551', 1, 'quiz_passed', 0.9),
  ('55555555-5555-5555-5555-555555555551', 2, 'quiz_passed', 0.8),
  ('55555555-5555-5555-5555-555555555551', 3, 'quiz_passed', 0.75);

INSERT INTO certification_observations (teacher_id, status) VALUES
  ('55555555-5555-5555-5555-555555555551', 'pending');
