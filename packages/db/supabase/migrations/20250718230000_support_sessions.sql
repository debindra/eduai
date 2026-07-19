-- Phase 7 / P7-DB-02: support_sessions — time-boxed, consented drill-down.
-- Per-child / per-school detail is only reachable inside an active session.
-- Every such access appends to audit_log (Nest AuditService).

CREATE TYPE support_session_status AS ENUM (
  'pending',
  'active',
  'expired',
  'revoked'
);

CREATE TABLE support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_admin_id uuid NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  reason text NOT NULL,
  granted_by text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status support_session_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_sessions_expires_after_starts
    CHECK (expires_at > starts_at)
);

CREATE INDEX support_sessions_platform_admin_idx
  ON support_sessions (platform_admin_id);

CREATE INDEX support_sessions_school_active_idx
  ON support_sessions (school_id, status)
  WHERE status = 'active';

CREATE TRIGGER support_sessions_set_updated_at
  BEFORE UPDATE ON support_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE support_sessions IS
  'Time-boxed consented support sessions for platform drill-down into ONE school. '
  'Expired/revoked sessions cannot authorize school-scoped endpoints.';

CREATE OR REPLACE FUNCTION has_active_support_session(p_school_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM support_sessions ss
    WHERE ss.platform_admin_id = current_platform_admin_id()
      AND ss.school_id = p_school_id
      AND ss.status = 'active'
      AND ss.starts_at <= now()
      AND ss.expires_at > now()
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION has_active_support_session(uuid) IS
  'True when the current platform admin has an active, unexpired support '
  'session for the given school. Nest PlatformSupportSessionGuard is the '
  'primary gate; this helper is for RLS reference.';

ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;

-- Platform admin can read their own sessions. No SELECT for school roles.
CREATE POLICY support_sessions_platform_self_read ON support_sessions
  FOR SELECT TO authenticated
  USING (platform_admin_id = current_platform_admin_id());
