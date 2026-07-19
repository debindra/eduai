-- Phase 7 / P7-DB-01: platform_admins — cross-tenant identity axis.
-- Platform privilege must NOT depend on a fake/wildcard school_memberships row
-- (school_id is NOT NULL on that table). One identity may be a platform admin
-- OR hold school memberships; privilege is independent.

CREATE TABLE platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL UNIQUE REFERENCES identities(id) ON DELETE CASCADE,
  display_name text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER platform_admins_set_updated_at
  BEFORE UPDATE ON platform_admins FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE platform_admins IS
  'Cross-tenant platform super-admin identities. No school_id. '
  'Mutations go through Nest service-role + RequirePlatformAdminGuard.';

CREATE OR REPLACE FUNCTION current_platform_admin_id()
RETURNS uuid AS $$
  SELECT pa.id
  FROM platform_admins pa
  WHERE pa.identity_id = current_identity_id()
    AND pa.status = 'active'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_platform_admin_id() IS
  'Active platform_admins row for the current identity, or NULL. '
  'Used by RLS on platform_admins / support_sessions.';

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Self-read only. Writes via service role (fail closed for authenticated).
CREATE POLICY platform_admins_self_read ON platform_admins
  FOR SELECT TO authenticated
  USING (identity_id = current_identity_id());
