# Phase 8 — ECA / CCA catalog + calendar (tasks)

Source checklist: [`PHASE_TASKS.md`](../../../PHASE_TASKS.md) · Phase 8.
Status: [`../status/phase-8.md`](../status/phase-8.md).

**Exit criteria:** a platform super admin can maintain a global ECA/CCA
catalog (name, kind, icon from a fixed allowlist, active/soft-delete); a
school admin can enable catalog items or add school-only items and place
them on the school calendar with icons; ECA/CCA remain board markers only
and do **not** subtract from `teaching_days`.

**Sequencing:** catalog schema → school items schema → closure FK →
seed → platform catalog API → school items API → calendar link API →
platform SPA catalog page → school manage UI → calendar picker + board
icons → tests.

**Why this phase (vs free-text closures alone):** Phase 0/7 already allow
`calendar_closures.category ∈ {school_holiday, eca, cca}` as free-text
markers. Schools need a shared predefined vocabulary with icons, plus the
ability to extend with school-only activities — without inventing a second
calendar system or touching teaching-day arithmetic.

**Access model:**

```
super_admin
  └── CRUD eca_cca_catalog (global)

school admin (school-scoped)
  ├── Enable / disable global catalog rows for this school
  ├── CRUD school-only school_eca_cca_items
  └── Place enabled / school-only items on calendar_closures
        (school_activity_id + category eca|cca)
```

**Invariants preserved:** `teaching_days` always derived and ECA/CCA still
excluded from subtraction (#6); gravity (#3); no rank-order (#2);
deterministic calendar paths (#13); no LLM on catalog/calendar.

**Open items surfaced (do not silently resolve):**
- Icon set is a fixed allowlist of keys (no arbitrary uploads this phase).
- Participation, staff/section assignment, recurring weekly slots, parent
  activity list, and admin uptake analytics are explicitly out of scope.

---

## Database / Schema

### P8-DB-01 — Global `eca_cca_catalog`
- **Area:** Database
- **Depends on:** P7-DB-01 (platform admin identity for write path)
- **Acceptance:** Table `eca_cca_catalog` with at least:
  `id`, `name`, `kind` (`eca` | `cca`), `icon_key` (text constrained to a
  documented allowlist via CHECK or documented enum + app validation),
  `sort_order`, `is_active`, `deleted_at` (soft-delete), timestamps.
  RLS: authenticated may read active (non-deleted) rows; mutations go
  through Nest service-role + `RequirePlatformAdminGuard` only. No
  `school_id` on this table.
- **Refs:** `packages/db/supabase/migrations/20250718260000_calendar_closure_category.sql`
  (existing `eca`/`cca` kind vocabulary), Phase 7 platform admin pattern

### P8-DB-02 — Per-school `school_eca_cca_items`
- **Area:** Database
- **Depends on:** P8-DB-01, P0-DB-01
- **Acceptance:** Table `school_eca_cca_items` with:
  - `school_id` NOT NULL
  - either `catalog_id` (enabled global row) **or** school-local fields
    (`name`, `kind`, `icon_key`) when `catalog_id` IS NULL
  - unique `(school_id, catalog_id)` where `catalog_id` is not null
  - soft-delete / `is_active` as needed for enable/disable
  CHECK: school-local rows require name/kind/icon; catalog-backed rows
  must not overwrite global name/kind/icon in this table (resolve via
  join at read time). RLS: school-scoped read/write for that school's
  admin membership; no cross-school SELECT.
- **Refs:** gravity / tenant isolation (`CLAUDE.md` invariant #3)

### P8-DB-03 — Link closures to school activities
- **Area:** Database
- **Depends on:** P8-DB-02, P0-DB-03
- **Acceptance:** `calendar_closures.school_activity_id` nullable FK →
  `school_eca_cca_items`. When set, `category` must be `eca` or `cca`
  (CHECK). When `category = school_holiday`, `school_activity_id` must be
  null. Free-text ECA/CCA rows without `school_activity_id` remain valid
  for backward compatibility. `teaching_days` VIEW unchanged: still
  excludes only `school_holiday` (and national) closures — never ECA/CCA.
- **Refs:**
  `packages/db/supabase/migrations/20250718260000_calendar_closure_category.sql`,
  `CLAUDE.md` invariant #6

### P8-DB-04 — Seed catalog + School X enables
- **Area:** Database
- **Depends on:** P8-DB-01 … P8-DB-03, P0-SEED-01
- **Acceptance:** Seed ~8–12 Nepal-relevant ECA/CCA catalog rows (mix of
  `eca` and `cca`, distinct `icon_key`s from the allowlist). School X
  enables a non-empty subset via `school_eca_cca_items`. After
  `db:reset` (+ auth seed if needed), catalog list and school enabled
  set are non-empty. Document intentional empties. Extend
  `scripts/verify-seed.mjs` if the project already verifies related
  tables.
- **Refs:** `packages/db/supabase/seed.sql`, `scripts/verify-seed.mjs`

---

## Backend (NestJS)

### P8-API-CAT-01 — Platform catalog CRUD
- **Area:** Backend
- **Depends on:** P8-DB-01, P7-API-PLAT-01, P0-API-SWAGGER-01
- **Acceptance:** `EcaCcaCatalogModule` (or equivalent under platform):
  list / create / update / soft-delete catalog rows. Super-admin only
  (`RequirePlatformAdminGuard`). Reject unknown `icon_key`. Deterministic
  — **zero AI calls**. Fully Swagger-decorated.
- **Refs:** `apps/api/src/modules/` platform patterns from Phase 7;
  `CLAUDE.md` invariant #13

### P8-API-SCH-01 — School enable + school-only CRUD
- **Area:** Backend
- **Depends on:** P8-DB-02, P8-API-CAT-01, school admin guards
- **Acceptance:** School-admin endpoints to:
  - list available global catalog (active) + this school's enabled /
    school-only items
  - enable / disable a catalog item for the school
  - create / update / soft-delete school-only items (name, kind, icon_key)
  School callers cannot mutate `eca_cca_catalog`. Cross-school IDs → 403/404.
  Fully Swagger-decorated.
- **Refs:** school admin module patterns; tenant isolation

### P8-API-CAL-01 — Calendar closures with activity link
- **Area:** Backend
- **Depends on:** P8-DB-03, P8-API-SCH-01, P0-API-CAL-01 / P7-API-CAL-02
- **Acceptance:** Create/update local closure DTOs accept optional
  `schoolActivityId`. When present: resolve to the school's item, set
  `category` from item kind (`eca`/`cca`), reject if item not in school
  scope. List/board payloads include activity `icon_key` / display name
  when linked. Free-text ECA/CCA without activity id still allowed.
  Teaching-days endpoints unchanged in behavior for ECA/CCA (no
  subtraction). Fully Swagger-decorated; regenerate web API types after
  merge.
- **Refs:** `apps/api/src/modules/calendar/`,
  `apps/web/src/features/calendar/`

---

## Frontend (Svelte 5 SPA + Tailwind)

### P8-WEB-PLAT-01 — Platform catalog page
- **Area:** Frontend
- **Depends on:** P8-API-CAT-01, P7-WEB-PLAT-02
- **Acceptance:** Platform route (e.g. `/platform/eca-cca`) lists catalog
  with icon, kind, active state; create/edit/soft-delete via dialogs.
  Icon picker limited to the allowlist (no file upload). Add nav link in
  `PlatformNav`. Route permission UX only; API enforces.
- **Refs:** `apps/web/src/features/shared/PlatformNav.svelte`,
  `apps/web/src/features/platform/`, `apps/web/src/router/routes.ts`

### P8-WEB-ADM-01 — School ECA/CCA manage surface
- **Area:** Frontend
- **Depends on:** P8-API-SCH-01, P0-WEB admin manage patterns
- **Acceptance:** School-admin UI (Manage feature or dedicated section)
  to browse global catalog, enable/disable for the school, and
  add/edit/delete school-only items (name, kind, icon). Does not expose
  global catalog mutation controls.
- **Refs:** `apps/web/src/features/manage/`, Admin nav

### P8-WEB-CAL-01 — Calendar picker + board icons
- **Area:** Frontend
- **Depends on:** P8-API-CAL-01, P8-WEB-ADM-01, P7-WEB-CAL-01
- **Acceptance:** When adding/editing a local closure with ECA/CCA type,
  prefer an activity picker over free-text alone (enabled + school-only
  items). Selecting an activity sets name/kind/icon via
  `schoolActivityId`. Calendar board markers show the activity icon when
  linked. Free-text fallback remains for unlinked legacy rows.
  Component/logic tests for picker mapping.
- **Refs:**
  `apps/web/src/features/calendar/components/ClosureFormDialog.svelte`,
  `apps/web/src/features/calendar/components/CalendarBoard.svelte`,
  `apps/web/src/features/calendar/calendar-markers-logic.ts`

---

## Testing / CI

### P8-TEST-01 — RBAC + school isolation
- **Area:** Testing
- **Depends on:** P8-API-CAT-01, P8-API-SCH-01
- **Acceptance:** School admin cannot create/update/delete global catalog
  rows (403). School A cannot read or mutate School B's
  `school_eca_cca_items`. Platform catalog CRUD allow + deny covered.
  Guard/service unit tests.

### P8-TEST-02 — Calendar link + teaching_days
- **Area:** Testing
- **Depends on:** P8-DB-03, P8-API-CAL-01
- **Acceptance:** Linked ECA/CCA closure does not reduce `teaching_days`
  for overlapping terminals; `school_holiday` still does. Invalid
  `schoolActivityId` (wrong school / holiday category conflict) rejected.
  VIEW remains derived (no stored count column).

### P8-TEST-03 — Frontend picker + icons
- **Area:** Testing
- **Depends on:** P8-WEB-CAL-01, P8-WEB-PLAT-01
- **Acceptance:** Pure logic and/or component tests: icon allowlist
  mapping, activity picker → closure draft fields, board marker shows
  icon when `schoolActivityId` / icon_key present. Run
  `pnpm --filter @eduai/web test` for touched specs.

---

## Out of scope this phase

- Participation / attendance per activity.
- Teacher or section assignment to activities.
- Recurring weekly slots (beyond one-off / date-range calendar markers).
- Parent-facing activity list or portal.
- Admin uptake analytics / aggregate ECA counts across children.
- Arbitrary icon file uploads (R2 or otherwise) — allowlist keys only.
- Changing `teaching_days` arithmetic for ECA/CCA.
- LLM involvement in catalog or calendar paths.
- Parent web portal access mechanism (open item, unchanged).
