# Phase 7 — Platform / Super Admin + Nepali calendar redesign (tasks)

Source checklist: [`PHASE_TASKS.md`](../../../PHASE_TASKS.md) · Phase 7.
Status: [`../status/phase-7.md`](../status/phase-7.md).

**Exit criteria:** a platform super admin can (1) list every school and see
per-school aggregate shapes without child names/distributions; (2) open an
audited, time-boxed support session and drill into one school's admin
surfaces; (3) maintain a published national calendar (govt holidays /
festivals / days off) that auto-applies into every school's
`teaching_days`; (4) use a hamropatro-style BS-primary calendar (monthly +
12-month overview) shared by platform and school-admin UIs.

**Sequencing:** platform identity schema → support sessions → national
calendar schema + `teaching_days` VIEW → BS↔AD package → platform auth /
guards → national calendar API → school calendar auto-apply → shared
NepaliCalendar UI → school wizard rebuild → platform SPA routes → tests.

**Why a new axis (not an extension of school `admin`):** roles today are
`teacher | admin | guardian | trainer_viewer`, all bound to one school via
`school_memberships` where `school_id` is `NOT NULL`. Login returns a single
`schoolId`. There is no cross-tenant identity. See
`apps/api/src/modules/auth/guards/supabase-auth.guard.ts` and
`apps/web/src/lib/shared/stores/session.ts`.

**Access model (reconciles full drill-down with the gravity rule):**

```
super_admin identity (no school membership)
  ├── Cross-tenant board: per-school counts/shapes only
  └── Open consented, time-boxed support_session
        └── Scoped drill-down into ONE target school's admin surfaces
              └── every access → audit_log (append-only)
```

Default view stays aggregate-only (invariant #3, no rank-order #2).
Per-child / per-school detail is only reachable inside an active
`support_session`, keeping invariants #3 and #14 intact while granting
full drill-down when consented and audited.

**Invariants preserved:** gravity (#3), audited consent (#14), no
rank-order (#2), `teaching_days` always derived (#6), band-as-data (#4),
deterministic calendar/docgen (#13).

**Open items surfaced (do not silently resolve):**
- BS↔AD conversion library choice needs confirming (`CLAUDE.md` 7).
- National festival template yearly-refresh owner needs sourcing
  (`CLAUDE.md` 7) — do not hardcode a single year's movable dates.
- Parent-portal open item is untouched by this phase.

---

## Database / Schema

### P7-DB-01 — Platform-admin identity
- **Area:** Database
- **Depends on:** P0-DB-01
- **Acceptance:** `platform_admins` table linked to `identities`
  (no `school_id`), so the role exists without breaking
  `school_memberships.school_id NOT NULL`. One identity may be a platform
  admin **or** hold school memberships, but platform privilege must not
  depend on a fake/wildcard school row. RLS: platform-admin rows are
  readable by the owning identity; mutations go through Nest service-role
  + `RequirePlatformAdminGuard` only.
- **Refs:** `packages/db/supabase/migrations/20250718120000_identity_tenant_auth.sql`,
  `docs/specs/Data_Model_Identity_Addendum_v1.md` 2 (platform team
  creates schools), `CLAUDE.md` invariant #3

### P7-DB-02 — `support_sessions` + consent
- **Area:** Database
- **Depends on:** P7-DB-01
- **Acceptance:** `support_sessions` table with
  `(platform_admin_id, school_id, reason, granted_by, starts_at,
  expires_at, status)`. Status values: `pending` | `active` | `expired` |
  `revoked`. Drill-down access while a session is `active` appends to
  existing `audit_log` (action, actor identity, school_id, resource path,
  timestamp). Expired/revoked sessions cannot authorize any school-scoped
  endpoint. No SELECT on `audit_log` for school roles; platform read of
  audit is a later ticket (P7-API-PLAT-04 deferred / suggested).
- **Refs:** `CLAUDE.md` invariants #3 and #14; existing `audit_log` from
  P0-DB-10

### P7-DB-03 — Global national calendar master
- **Area:** Database
- **Depends on:** P0-DB-03
- **Acceptance:** `national_calendars` (`bs_year` unique, status
  `draft` | `published`, timestamps) + `national_closures`
  (`national_calendar_id` FK, `name`, `category` in
  `govt_holiday` | `festival` | `day_off`, `start_date` / `end_date` as
  AD `date` for joinability with `teaching_days`, optional BS label
  fields, `movable` boolean). No hardcoded single-year dates in
  application code — movable festivals are **data rows**, and the yearly
  refresh owner remains an open product item. Only one `published`
  calendar per `bs_year`. Deterministic; no LLM involvement.
- **Refs:** `.cursor/rules/calendar-pacing.mdc`, `CLAUDE.md` 7
  (national festival template / yearly refresh owner)

### P7-DB-04 — Extend `teaching_days` VIEW for national closures
- **Area:** Database
- **Depends on:** P7-DB-03, P0-DB-04
- **Acceptance:** `teaching_days` VIEW excludes a day if it falls in a
  **published** national closure **or** a per-school
  `calendar_closures` row. Remains a VIEW recomputed on read — never a
  stored count column (invariant #6). School local/manual closures still
  layer on top. Existing school calendars keep working when no national
  calendar is published yet.
- **Refs:** `packages/db/supabase/migrations/20250718140000_calendar_spine.sql`
  (`teaching_days` VIEW), `CLAUDE.md` invariant #6

### P7-DB-05 — Seed platform admin + national calendar
- **Area:** Database
- **Depends on:** P7-DB-01 … P7-DB-04, P0-SEED-04
- **Acceptance:** Seed one platform admin identity (auth-linked via
  seed-dev-auth extension or sibling script); one `published`
  `national_calendars` row for the current BS year with representative
  closures (Dashain / Tihar / at least one fixed govt holiday) as **data
  rows** marked `movable` where appropriate. After `db:reset` + auth
  seed, `teaching_days` still yields non-zero counts per School X
  terminal. Document intentional empties. Verify via
  `scripts/verify-seed.mjs` extension.
- **Refs:** `packages/db/supabase/seed.sql`, `scripts/seed-dev-auth.mjs`

---

## Backend (NestJS)

### P7-API-PLAT-01 — Platform login + `RequirePlatformAdminGuard`
- **Area:** Backend
- **Depends on:** P7-DB-01, P0-API-AUTH-03, P0-API-AUTH-06
- **Acceptance:** Login path detects `platform_admins` membership and
  returns session with `memberType = 'super_admin'`, `schoolId = null`.
  `RequirePlatformAdminGuard` rejects non-platform callers. Also fix the
  existing arbitrary `.limit(1)` multi-membership school-login gap
  (return memberships / require school selection) so multi-school users
  are not ambiguous — at minimum document and implement deterministic
  selection for school admins/teachers; platform path is separate and
  must not collide. Fully Swagger-decorated.
- **Refs:** `apps/api/src/modules/auth/auth.service.ts`,
  `apps/web/src/lib/shared/stores/session.ts`

### P7-API-PLAT-02 — `PlatformModule` tenant monitoring
- **Area:** Backend
- **Depends on:** P7-API-PLAT-01, P0-API-RBAC-02
- **Acceptance:** `GET /platform/schools` lists all tenants (id, name,
  region, tier, licensed_band_range, exit_status, high-level counts —
  sections total, sections behind, etc.). Per-school aggregate shapes
  only. Responses run through (extended)
  `AdminGravityRuleInterceptor` (or a platform variant with the same
  strip set). **No** child names, band/rating distributions, or
  rank-order across children/teachers. Fully Swagger-decorated.
- **Refs:** `CLAUDE.md` invariants #2 and #3;
  `apps/api/src/modules/rbac/interceptors/admin-gravity-rule.interceptor.ts`

### P7-API-PLAT-03 — Support sessions + drill-down guard
- **Area:** Backend
- **Depends on:** P7-DB-02, P7-API-PLAT-01
- **Acceptance:** `POST /platform/support-sessions` (create with reason +
  school + expiry), list/revoke endpoints. `PlatformSupportSessionGuard`
  lets a super admin reach **school-scoped** admin endpoints for the
  **target school only** while a session is `active`. Every such access
  appends to `audit_log`. Without an active session, school-scoped
  endpoints return 403 for platform callers. Fully Swagger-decorated;
  guard unit tests cover allow + deny.
- **Refs:** `CLAUDE.md` invariants #3 and #14

### P7-API-CAL-NAT-01 — `NationalCalendarModule` CRUD
- **Area:** Backend
- **Depends on:** P7-DB-03, P7-API-PLAT-01, P0-API-SWAGGER-01
- **Acceptance:** Super-admin-only CRUD for `national_calendars` and
  `national_closures` (create draft year, edit closures, publish,
  list). Deterministic — **zero AI calls**. Publishing a calendar makes
  its closures visible to `teaching_days` for all schools. Fully
  Swagger-decorated.
- **Refs:** `CLAUDE.md` invariant #13; Calendar spec / `.cursor/rules/calendar-pacing.mdc`

### P7-API-CAL-02 — School calendar auto-applies national closures
- **Area:** Backend
- **Depends on:** P7-API-CAL-NAT-01, P7-DB-04, P0-API-CAL-01
- **Acceptance:** `CalendarService.setupCalendar` (and festival-template
  flow) **stops** using the hardcoded `DEFAULT_FESTIVAL_TEMPLATE` in
  `apps/api/src/modules/calendar/calendar.service.ts`. Instead, setup /
  festival GET reflects the published national closures for the
  calendar's BS year (or session span). School admin may still add /
  edit `local` / `manual` closures on top; they must not overwrite
  national rows. Existing approve + teaching-days endpoints remain
  correct after the VIEW change.
- **Refs:** `apps/api/src/modules/calendar/calendar.service.ts`

### P7-API-BS-01 — Shared BS↔AD conversion package
- **Area:** Backend / packages
- **Depends on:** —
- **Acceptance:** New `@eduai/bs-date` (or agreed package name) wrapping
  a **vetted** BS↔AD library (choice confirmed before merge — open item
  in `CLAUDE.md` 7 / Phase 6 P6-CONTENT-03). Pure functions: AD date ↔
  BS year/month/day; month length; year bounds. Used by API (national
  calendar labels) and web (NepaliCalendar). Unit-tested across BS/AD
  year boundaries. No network calls at runtime.
- **Refs:** `CLAUDE.md` 7; `docs/phases/tasks/phase-6-pilot-launch.md`
  P6-CONTENT-03 (library finalize may land here or coordinate with
  Phase 6)

---

## Frontend (Svelte 5 SPA + Tailwind)

### P7-WEB-BS-01 — Shared `NepaliCalendar` primitive
- **Area:** Frontend
- **Depends on:** P7-API-BS-01
- **Acceptance:** Shared component under
  `apps/web/src/features/shared/` (hamropatro-style):
  - **BS date prominent** (large), **AD date secondary** (small);
    Devanagari numerals for BS day where the design system allows.
  - **Monthly view** (large): prev / next month only within the
    **current BS year** — no year change control.
  - **12-month overview** on a single page; selecting a month enlarges
    it into the monthly view (and back).
  - Pure presentation + `@eduai/bs-date`; no festival CRUD inside the
    primitive (callers overlay closures).
  - Component tests for month navigation bounds and view toggle.
- **Refs:** https://www.hamropatro.com/ (visual reference only — do not
  scrape or hardcode their data)

### P7-WEB-CAL-01 — Rebuild school calendar wizard on NepaliCalendar
- **Area:** Frontend
- **Depends on:** P7-WEB-BS-01, P7-API-CAL-02, P0-WEB-04
- **Acceptance:** Rebuild
  `apps/web/src/features/calendar/CalendarWizard.svelte` to use
  `NepaliCalendar` instead of native `<input type="date">`. Support
  multi-terminal setup, add/remove local closures, BS-primary display
  of session / terminal / festival dates. National closures shown
  read-only (or clearly labeled as national) so school admins understand
  what auto-applied. Teaching-days panel still shows counts only.
- **Refs:** `apps/web/src/features/calendar/`

### P7-WEB-PLAT-01 — Super-admin route group + session
- **Area:** Frontend
- **Depends on:** P7-API-PLAT-01 … P7-API-PLAT-03, P7-API-CAL-NAT-01,
  P7-WEB-BS-01, P0-WEB-03
- **Acceptance:** Extend `session.ts` / `permission-logic.ts` /
  `routes.ts` for `super_admin`. New feature folder
  `apps/web/src/features/platform/` with: tenant monitoring board
  (counts/shapes), national-calendar editor (uses `NepaliCalendar`),
  support-session create / list / enter. Route permissions are UX only;
  API enforces. Client gravity-safe asserts on monitoring payloads.
- **Refs:** `apps/web/src/router/routes.ts`,
  `apps/web/src/lib/shared/stores/session.ts`

### P7-WEB-PLAT-02 — Login redirect + platform nav
- **Area:** Frontend
- **Depends on:** P7-WEB-PLAT-01
- **Acceptance:** Login redirects `super_admin` to the platform board
  (not `/admin/dashboard`). Platform nav (tenants, national calendar,
  support sessions). School switcher / school-admin chrome appears
  **only** while an active support session is in the client session
  state; leaving/revoking the session clears school-scoped UI.
- **Refs:** `apps/web/src/features/auth/LoginPage.svelte`,
  `apps/web/src/features/shared/AdminNav.svelte` (do not overload school
  AdminNav — prefer a separate `PlatformNav`)

---

## Suggested additional super-admin powers

These are in scope for the **phase narrative** so product/engineering can
prioritize. Ticket the ones needed for exit criteria first; the rest may
be deferred tickets within Phase 7 or a follow-on.

### Ticketed for this phase (core)

Covered above: tenant list + aggregates, support-session drill-down,
national calendar CRUD, school calendar auto-apply, BS calendar UI.

### Recommended next tickets (same phase if capacity; else deferred)

| Suggested ID | Power | Why |
|---|---|---|
| P7-API-PLAT-04 | School provisioning: `POST /platform/schools` + invite first admin | Spec says platform team creates schools; unimplemented today |
| P7-API-BAND-01 | Band / grade-config / subjects management UI+API for `bands`, `grade_scales`, `band_subjects` | Band-as-data ownership is currently seed-only |
| P7-API-AI-01 | AI prompt-template management (`(feature, band)` rows) | Platform-owned content, not school-admin |
| P7-API-LIC-01 | Per-school licensing / feature flags (`tier`, `licensed_band_range`, `exit_status`) | Tenant lifecycle |
| P7-API-MET-01 | Cross-school out-of-segment + cache/cost dashboards | Extends Phase 5; platform gravity only |
| P7-API-AUDIT-01 | Audit-log review console (platform read of elevated actions) | Complements support sessions |

Do **not** give platform ops an unrestricted firehose of child PII outside
an active support session.

---

## Testing / CI

### P7-TEST-01 — Support-session + gravity + rank-order
- **Area:** Testing
- **Depends on:** P7-API-PLAT-02, P7-API-PLAT-03
- **Acceptance:** Drill-down without an active `support_session` → 403.
  Every successful drill-down access appears in `audit_log`. Platform
  list/aggregate endpoints pass rank-order lint and gravity strip
  checks (deliberately forbidden keys rejected / stripped). Guard unit
  tests: allow + deny.

### P7-TEST-02 — National closure reflows `teaching_days`
- **Area:** Testing
- **Depends on:** P7-DB-04, P7-API-CAL-NAT-01
- **Acceptance:** Adding / publishing a national closure reduces
  teaching-day counts for schools whose terminals overlap those dates;
  local closures still subtract independently; VIEW remains derived
  (no stored count column).

### P7-TEST-03 — BS↔AD conversion boundaries
- **Area:** Testing
- **Depends on:** P7-API-BS-01
- **Acceptance:** Unit tests for year/month boundaries (BS new year,
  AD new year, month length variation including 29–32 day BS months),
  round-trip AD→BS→AD within the library's supported range.

---

## Out of scope this phase

- Parent web portal access mechanism (open item, unchanged).
- Scraping or embedding third-party patro data feeds.
- Changing school-admin gravity rule for normal (non-session) admin
  dashboards.
- Storing `teaching_days` counts.
- LLM involvement in calendar or aggregation paths.
