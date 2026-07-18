-- Identity + tenant layer with Supabase Auth (no app-stored passwords).
-- Web login: username (email or mobile) + password via auth.users.
-- Phone/WhatsApp OTP: recovery + 2FA + WhatsApp-channel identity only — never web login.
-- Guardians: profile + guardian_child_links only; no invite/auth_user_id path in this phase.
-- See ARCHITECTURE.md Part 1 "Authentication" and Data_Model_Identity_Addendum_v1.md §2.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE membership_status AS ENUM ('active', 'suspended', 'revoked');
CREATE TYPE member_type AS ENUM ('teacher', 'admin', 'guardian', 'trainer_viewer');
CREATE TYPE child_status AS ENUM ('active', 'promoted', 'transferred', 'exited');

CREATE TABLE identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email text UNIQUE,
  phone text UNIQUE,
  phone_verified_at timestamptz,
  account_status text NOT NULL DEFAULT 'invited'
    CHECK (account_status IN ('invited', 'active', 'disabled')),
  invited_at timestamptz,
  invite_token_hash text,
  invite_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE identities IS
  'Global login identity for school-side actors. Passwords live in Supabase Auth '
  '(auth.users); this row links via auth_user_id. Synthetic emails for mobile-only '
  'accounts are never stored in identities.email — that column is real emails only.';

COMMENT ON COLUMN identities.auth_user_id IS
  'Links to auth.users(id). NULL until invite is accepted and a password is set '
  '(account_status transitions invited -> active). current_identity_id() resolves '
  'auth.uid() against this column.';

COMMENT ON COLUMN identities.email IS
  'Real email if the person has one. NULL for mobile-only accounts. Never store '
  'the synthetic @phone.eduai.internal mapping here.';

COMMENT ON COLUMN identities.account_status IS
  'invited: provisioned by admin, no password yet, cannot log in. active: password '
  'set, auth_user_id populated, can log in. disabled: access revoked — do not '
  'delete the row; history depends on identity/teacher ids indefinitely.';

COMMENT ON COLUMN identities.invite_token_hash IS
  'Hash of the custom invite token for mobile-only invites (WhatsApp/SMS). NULL '
  'once accepted or cleared. Email invites use Supabase inviteUserByEmail() and '
  'do not need this column.';

CREATE INDEX idx_identities_auth_user_id ON identities (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_identities_email ON identities (email)
  WHERE email IS NOT NULL;

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

COMMENT ON COLUMN school_memberships.member_type IS
  'Admin gate for admin-only endpoints is member_type = admin (RequireRole). '
  'Not a substitute for teacher_sections scope checks — admins have no implicit '
  'child-data access. Guardians are WhatsApp-only in this phase; membership '
  'exists for handshake linking, not web login.';

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

-- RLS helpers: resolve Supabase Auth session → identity / teacher profile.
-- Fail closed when account_status is not active (NULL = NULL is never true).

CREATE OR REPLACE FUNCTION current_identity_id()
RETURNS uuid AS $$
  SELECT id FROM identities
  WHERE auth_user_id = auth.uid()
    AND account_status = 'active'
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION current_identity_id() IS
  'Returns NULL for invited/disabled accounts even if a Supabase Auth session '
  'is still valid. Every RLS policy using this must fail closed on NULL.';

CREATE OR REPLACE FUNCTION current_teacher_id()
RETURNS uuid AS $$
  SELECT t.id
  FROM teachers t
  JOIN school_memberships sm ON sm.id = t.membership_id
  WHERE sm.identity_id = current_identity_id()
    AND sm.member_type = 'teacher'
    AND sm.status = 'active'
  LIMIT 1
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION current_teacher_id() IS
  'Teacher profile for the active identity. Pedagogy RLS (teacher_sections grain) '
  'will use this when student_outcomes / lesson_progress migrations land. '
  'Multi-school teachers: NestJS guard supplies school context; this helper is '
  'the single-membership baseline until school claim wiring exists.';

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

-- NestJS uses the service role for provisioning. Authenticated policies are
-- read-scoped; writes go through the API with service role or later policies.

CREATE POLICY identities_self_read ON identities
  FOR SELECT TO authenticated
  USING (id = current_identity_id());

CREATE POLICY school_memberships_self_read ON school_memberships
  FOR SELECT TO authenticated
  USING (
    identity_id = current_identity_id()
    AND status = 'active'
  );

CREATE POLICY schools_member_read ON schools
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_memberships sm
      WHERE sm.school_id = schools.id
        AND sm.identity_id = current_identity_id()
        AND sm.status = 'active'
    )
  );
