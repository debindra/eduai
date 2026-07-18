-- Local School X fixture — run via `supabase db reset`.
-- Passwords live in Supabase Auth only. After reset, run:
--   pnpm seed:dev-auth
-- Stable IDs (also referenced by scripts/seed-dev-auth.mjs):
--   school  11111111-1111-1111-1111-111111111111
--   section 66666666-6666-6666-6666-666666666666
--   band    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa  (migration)
--   outcome cccccccc-cccc-cccc-cccc-cccccccccccc  (migration)
-- Intentionally empty: subjects, band_subjects, audit_log, lesson_progress
-- Phase 1 fills: map_slices, map_slice_outcomes, prompts, extra outcomes

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
1. Never propose the top band/rating ("secure") from a single sighting alone unless the observation itself describes mastery unambiguously repeated or unmistakably independent.
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
-- Yearly map + deterministic theme placement across teaching days
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
