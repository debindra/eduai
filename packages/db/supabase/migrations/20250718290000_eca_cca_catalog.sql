-- Phase 8: global ECA/CCA catalog, per-school enable/school-only items,
-- and optional link from calendar_closures. ECA/CCA still do not subtract
-- from teaching_days (VIEW unchanged).

CREATE TYPE eca_cca_kind AS ENUM ('eca', 'cca');

-- Fixed icon allowlist (no arbitrary uploads this phase).
-- App + CHECK must stay in sync with ECA_CCA_ICON_KEYS in the API.
CREATE TABLE eca_cca_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind eca_cca_kind NOT NULL,
  icon_key text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eca_cca_catalog_icon_key_check CHECK (
    icon_key IN (
      'sports',
      'music',
      'art',
      'dance',
      'drama',
      'scout',
      'debate',
      'science',
      'computer',
      'yoga',
      'gardening',
      'library'
    )
  )
);

CREATE INDEX eca_cca_catalog_active_sort_idx
  ON eca_cca_catalog (sort_order, name)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE TRIGGER eca_cca_catalog_set_updated_at
  BEFORE UPDATE ON eca_cca_catalog FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE eca_cca_catalog IS
  'Platform-owned global ECA/CCA catalog. Mutations via Nest service-role + '
  'RequirePlatformAdminGuard. icon_key is an allowlist key, not a file upload.';

-- Per-school: enable a catalog row OR define a school-only activity.
CREATE TABLE school_eca_cca_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES eca_cca_catalog(id) ON DELETE RESTRICT,
  name text,
  kind eca_cca_kind,
  icon_key text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_eca_cca_items_shape CHECK (
    (
      catalog_id IS NOT NULL
      AND name IS NULL
      AND kind IS NULL
      AND icon_key IS NULL
    )
    OR (
      catalog_id IS NULL
      AND name IS NOT NULL
      AND kind IS NOT NULL
      AND icon_key IS NOT NULL
      AND icon_key IN (
        'sports',
        'music',
        'art',
        'dance',
        'drama',
        'scout',
        'debate',
        'science',
        'computer',
        'yoga',
        'gardening',
        'library'
      )
    )
  )
);

CREATE UNIQUE INDEX school_eca_cca_items_school_catalog_uq
  ON school_eca_cca_items (school_id, catalog_id)
  WHERE catalog_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX school_eca_cca_items_school_idx
  ON school_eca_cca_items (school_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER school_eca_cca_items_set_updated_at
  BEFORE UPDATE ON school_eca_cca_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE school_eca_cca_items IS
  'School enable of a global catalog row (catalog_id set) or school-only '
  'activity (catalog_id null + local name/kind/icon). Display fields for '
  'catalog-backed rows resolve via join.';

ALTER TABLE calendar_closures
  ADD COLUMN school_activity_id uuid
    REFERENCES school_eca_cca_items(id) ON DELETE SET NULL;

ALTER TABLE calendar_closures
  ADD CONSTRAINT calendar_closures_activity_category_check CHECK (
    (
      school_activity_id IS NULL
    )
    OR (
      school_activity_id IS NOT NULL
      AND category IN ('eca', 'cca')
    )
  );

ALTER TABLE calendar_closures
  ADD CONSTRAINT calendar_closures_holiday_no_activity_check CHECK (
    category <> 'school_holiday'
    OR school_activity_id IS NULL
  );

COMMENT ON COLUMN calendar_closures.school_activity_id IS
  'Optional link to school_eca_cca_items when category is eca/cca. '
  'Free-text ECA/CCA without a link remain valid.';

ALTER TABLE eca_cca_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_eca_cca_items ENABLE ROW LEVEL SECURITY;

-- Authenticated may read active non-deleted catalog rows.
CREATE POLICY eca_cca_catalog_active_read ON eca_cca_catalog
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND is_active = true);

-- School members may read their school's items.
CREATE POLICY school_eca_cca_items_member_read ON school_eca_cca_items
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM school_memberships sm
      WHERE sm.school_id = school_eca_cca_items.school_id
        AND sm.identity_id = current_identity_id()
        AND sm.status = 'active'
    )
  );

-- Writes go through Nest service-role + guards (no INSERT/UPDATE/DELETE for authenticated).
