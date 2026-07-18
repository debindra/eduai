-- Phase 4 engineering slice: basic_upper band-as-data (Grades 4–5).
-- Content gate remains: real outcomes bank + final NG–A+ cut-offs / subject
-- list still need trainer/ECE (and CDC) sign-off. Rows here are structural
-- fixtures so the Phase 3 pipeline can run with zero new application code.

-- ---------------------------------------------------------------------------
-- P4-DB-01: basic_upper band + four_point rating + NG–A+ letter scales
-- ---------------------------------------------------------------------------
-- Stable id: b4000000-... (basic_upper). assessment_mode / aggregation_rule
-- identical to basic_early — that identity is the "zero code branch" proof.
INSERT INTO bands (id, code, name_en, name_np, assessment_mode, aggregation_rule, grade_range)
VALUES (
  'b4000000-0000-0000-0000-000000000001',
  'basic_upper',
  'Basic education (upper)',
  'आधारभूत शिक्षा (उच्च)',
  'four_point_scale',
  'mean_of_four_percent_letter',
  'Grade 4–5'
)
ON CONFLICT (code) DO NOTHING;

-- 1–4 CDC rating scale (kind=rating) — same value domain as basic_early
INSERT INTO grade_scales (band_id, code, label_en, label_np, sort_order, numeric_value, kind) VALUES
  ('b4000000-0000-0000-0000-000000000001', '1', 'Beginning', 'आरम्भ', 1, 1, 'rating'),
  ('b4000000-0000-0000-0000-000000000001', '2', 'Developing', 'विकासशील', 2, 2, 'rating'),
  ('b4000000-0000-0000-0000-000000000001', '3', 'Proficient', 'दक्ष', 3, 3, 'rating'),
  ('b4000000-0000-0000-0000-000000000001', '4', 'Advanced', 'उन्नत', 4, 4, 'rating')
ON CONFLICT (band_id, code) DO NOTHING;

-- NG–A+ letter grades with percentage cut-offs (kind=letter).
-- PROVISIONAL — exact CDC/NEB basic-level cut-offs need trainer confirmation.
-- Correcting later is a row edit, not a code change.
INSERT INTO grade_scales (band_id, code, label_en, label_np, sort_order, numeric_value, kind, min_percent, max_percent) VALUES
  ('b4000000-0000-0000-0000-000000000001', 'NG', 'NG', 'एनजी', 1, NULL, 'letter', 0, 19.99),
  ('b4000000-0000-0000-0000-000000000001', 'E', 'E', 'ई', 2, NULL, 'letter', 20, 34.99),
  ('b4000000-0000-0000-0000-000000000001', 'D', 'D', 'डी', 3, NULL, 'letter', 35, 49.99),
  ('b4000000-0000-0000-0000-000000000001', 'C', 'C', 'सी', 4, NULL, 'letter', 50, 64.99),
  ('b4000000-0000-0000-0000-000000000001', 'B', 'B', 'बी', 5, NULL, 'letter', 65, 74.99),
  ('b4000000-0000-0000-0000-000000000001', 'A', 'A', 'ए', 6, NULL, 'letter', 75, 89.99),
  ('b4000000-0000-0000-0000-000000000001', 'A+', 'A+', 'ए+', 7, NULL, 'letter', 90, 100)
ON CONFLICT (band_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- P4-DB-02: seven-subject Grade 4–5 list
-- ---------------------------------------------------------------------------
-- Reuse Grades 1–3 core five; add two upper-basic subjects.
-- PROVISIONAL subject codes (health_pe, local_subject) — confirm against
-- school timetable / CDC basic curriculum before pilot.
INSERT INTO subjects (id, code, name_en, name_np) VALUES
  ('d1111111-1111-1111-1111-111111111116', 'health_pe', 'Health & Physical Education', 'स्वास्थ्य तथा शारीरिक शिक्षा'),
  ('d1111111-1111-1111-1111-111111111117', 'local_subject', 'Local Subject / Optional', 'स्थानीय विषय / वैकल्पिक')
ON CONFLICT (code) DO NOTHING;

INSERT INTO band_subjects (band_id, subject_id, sort_order) VALUES
  ('b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 1), -- nepali
  ('b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111112', 2), -- english
  ('b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111113', 3), -- math
  ('b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111114', 4), -- science
  ('b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111115', 5), -- social
  ('b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111116', 6), -- health_pe
  ('b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111117', 7)  -- local_subject
ON CONFLICT (band_id, subject_id) DO NOTHING;

-- Placeholder Grade 4–5 outcomes (trainer bank later — not the real bank).
-- One per subject so fixtures / FKs have a target.
INSERT INTO outcomes (id, band_id, subject_id, code, framework, statement_en, statement_np, sort_order) VALUES
  ('c4444444-4444-4444-4444-444444444401', 'b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111', 'G4-NEP-001', 'cdc_outcome', 'Placeholder Grade 4–5 Nepali outcome — replace with trainer-authored bank', 'placeholder', 1),
  ('c4444444-4444-4444-4444-444444444402', 'b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111112', 'G4-ENG-001', 'cdc_outcome', 'Placeholder Grade 4–5 English outcome — replace with trainer-authored bank', 'placeholder', 2),
  ('c4444444-4444-4444-4444-444444444403', 'b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111113', 'G4-MATH-001', 'cdc_outcome', 'Placeholder Grade 4–5 Mathematics outcome — replace with trainer-authored bank', 'placeholder', 3),
  ('c4444444-4444-4444-4444-444444444404', 'b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111114', 'G4-SCI-001', 'cdc_outcome', 'Placeholder Grade 4–5 Science outcome — replace with trainer-authored bank', 'placeholder', 4),
  ('c4444444-4444-4444-4444-444444444405', 'b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111115', 'G4-SOC-001', 'cdc_outcome', 'Placeholder Grade 4–5 Social Studies outcome — replace with trainer-authored bank', 'placeholder', 5),
  ('c4444444-4444-4444-4444-444444444406', 'b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111116', 'G4-HPE-001', 'cdc_outcome', 'Placeholder Grade 4–5 Health & PE outcome — replace with trainer-authored bank', 'placeholder', 6),
  ('c4444444-4444-4444-4444-444444444407', 'b4000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111117', 'G4-LOC-001', 'cdc_outcome', 'Placeholder Grade 4–5 Local/Optional outcome — replace with trainer-authored bank', 'placeholder', 7)
ON CONFLICT (band_id, code) DO NOTHING;
