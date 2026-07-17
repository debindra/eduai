-- Identity + tenant layer (Data Model & Identity Addendum v1, section 3a)
-- Custom app auth on `identities` (username + password primary; phone OTP secondary).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE identity_status AS ENUM ('active', 'pending_verification', 'suspended');
CREATE TYPE membership_status AS ENUM ('active', 'suspended', 'revoked');
CREATE TYPE member_type AS ENUM ('teacher', 'admin', 'guardian', 'trainer_viewer');
CREATE TYPE child_status AS ENUM ('active', 'promoted', 'transferred', 'exited');

CREATE TABLE identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  password_hash text NOT NULL,
  phone text,
  phone_verified_at timestamptz,
  status identity_status NOT NULL DEFAULT 'pending_verification',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identities_username_unique UNIQUE (username),
  CONSTRAINT identities_phone_unique UNIQUE (phone)
);

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  tier text,
  licensed_band_range text,
  exit_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE school_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  member_type member_type NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_memberships_unique UNIQUE (identity_id, school_id, member_type)
);

CREATE INDEX school_memberships_school_id_idx ON school_memberships (school_id);
CREATE INDEX school_memberships_identity_id_idx ON school_memberships (identity_id);

CREATE TABLE teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL UNIQUE REFERENCES school_memberships(id) ON DELETE CASCADE,
  display_name text,
  certification_status text,
  adaptation_signal jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE school_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL UNIQUE REFERENCES school_memberships(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL UNIQUE REFERENCES school_memberships(id) ON DELETE CASCADE,
  relationship text,
  language_pref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Minimal section/child stubs so guardian_child_links and substitute_access have FK targets.
CREATE TABLE sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  band_id uuid,
  grade text,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sections_school_id_idx ON sections (school_id);

CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  name text NOT NULL,
  roll_number text,
  dob date,
  status child_status NOT NULL DEFAULT 'active',
  report_language_override text,
  access_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT children_section_roll_unique UNIQUE (section_id, roll_number)
);

CREATE INDEX children_section_id_idx ON children (section_id);

CREATE TABLE guardian_child_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  relationship text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guardian_child_links_unique UNIQUE (guardian_id, child_id)
);

CREATE INDEX guardian_child_links_child_id_idx ON guardian_child_links (child_id);

CREATE TABLE substitute_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES identities(id),
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT substitute_access_expires_after_start CHECK (expires_at > starts_at)
);

CREATE INDEX substitute_access_section_id_idx ON substitute_access (section_id);
CREATE INDEX substitute_access_identity_id_idx ON substitute_access (identity_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER identities_set_updated_at
  BEFORE UPDATE ON identities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER schools_set_updated_at
  BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER school_memberships_set_updated_at
  BEFORE UPDATE ON school_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER teachers_set_updated_at
  BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER school_admins_set_updated_at
  BEFORE UPDATE ON school_admins FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER guardians_set_updated_at
  BEFORE UPDATE ON guardians FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sections_set_updated_at
  BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER children_set_updated_at
  BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- JWT claim helper for future RLS (API issues tokens with identity_id + school_id).
CREATE OR REPLACE FUNCTION current_identity_id()
RETURNS uuid AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json ->> 'identity_id',
    ''
  )::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_school_id()
RETURNS uuid AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json ->> 'school_id',
    ''
  )::uuid;
$$ LANGUAGE sql STABLE;

ALTER TABLE identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitute_access ENABLE ROW LEVEL SECURITY;

-- Default deny for anon/authenticated until app JWT wiring lands.
-- NestJS uses the service role for provisioning; policies tighten in Step 3+.

CREATE POLICY identities_self_read ON identities
  FOR SELECT TO authenticated
  USING (id = current_identity_id());

CREATE POLICY school_memberships_tenant_read ON school_memberships
  FOR SELECT TO authenticated
  USING (school_id = current_school_id() AND identity_id = current_identity_id());

CREATE POLICY schools_tenant_read ON schools
  FOR SELECT TO authenticated
  USING (id = current_school_id());
