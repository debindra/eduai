-- Local dev seed — run via `supabase db reset`.
-- Identity rows are created through the API (username + password hashing).

INSERT INTO schools (id, name, region, tier, licensed_band_range)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'School X (dev)',
  'Kathmandu',
  'pilot',
  'pre_primary'
);

INSERT INTO sections (id, school_id, grade, name)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'UKG',
  'UKG A'
);
