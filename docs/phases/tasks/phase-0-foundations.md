# Phase 0 — Foundations (tasks)

Source checklist: [`PHASE_TASKS.md`](../../../PHASE_TASKS.md) § Phase 0.
Status: [`../status/phase-0.md`](../status/phase-0.md).

**Exit criteria:** one school's calendar entered → festival-adjusted → approved;
`teaching_days` returns a real per-terminal count; CI blocks a deliberately
broken RLS policy and a deliberately added rank-order query.

**Sequencing:** schema → seed fixture (P0-SEED-*) → Swagger → Auth → Rbac →
BandConfig → Calendar → web plumbing → login → calendar wizard → CI.

**Note:** `yearly_map` / `map_slices` / `lesson_progress` **tables** land here;
the deterministic placement service (`YearlyMapModule`) is Phase 1.

---

## Database / Schema

### P0-DB-01 — Identity & tenant tables
- **Area:** Database
- **Depends on:** —
- **Acceptance:** `schools`, `identities`, `school_memberships`, `teachers`,
  `school_admins`, `guardians`, `sections`, `children` exist with FKs.
- **Refs:** `packages/db/supabase/migrations/20250718120000_identity_tenant_auth.sql`,
  `docs/specs/Data_Model_Identity_Addendum_v1.md` §3a

### P0-DB-02 — Identities auth columns (no password in Postgres)
- **Area:** Database
- **Depends on:** P0-DB-01
- **Acceptance:** `auth_user_id`, nullable unique `email` (real only), `phone`,
  `account_status` (`invited`|`active`|`disabled`), invite fields; no
  `password_hash`. Admin gate is `school_memberships.member_type = 'admin'`.
- **Refs:** `.cursor/rules/authentication.mdc`, ARCHITECTURE Part 1 Auth

### P0-DB-03 — Calendar tables
- **Area:** Database
- **Depends on:** P0-DB-01
- **Acceptance:** `school_calendars`, `terminals` (start/end/`reporting_type`
  only — **no test-date**), `calendar_closures`.
- **Refs:** `.cursor/rules/calendar-pacing.mdc`

### P0-DB-04 — `teaching_days` view
- **Area:** Database
- **Depends on:** P0-DB-03
- **Acceptance:** VIEW recomputed on read (span − weekly offs − closures);
  never a stored count column.

### P0-DB-05 — Band config tables + section FK
- **Area:** Database
- **Depends on:** P0-DB-01
- **Acceptance:** `bands`, `subjects`, `band_subjects`, `outcomes`,
  `grade_scales`; `sections.band_id` FK → `bands`.

### P0-DB-06 — `teacher_sections`
- **Area:** Database
- **Depends on:** P0-DB-05
- **Acceptance:** `subject_id` nullable, `is_class_teacher` boolean;
  RBAC backbone for two-grain RLS.

### P0-DB-07 — Map / progress table stubs
- **Area:** Database
- **Depends on:** P0-DB-03
- **Acceptance:** `yearly_map`, `map_slices`, `lesson_progress` tables exist
  (empty-capable; generator deferred to Phase 1).

### P0-DB-08 — Pedagogy stubs
- **Area:** Database
- **Depends on:** P0-DB-05, P0-DB-06
- **Acceptance:** `student_outcomes` (pre-primary slice; no `attempt` ENUM),
  `attendance_record`.

### P0-DB-09 — Two-grain RLS
- **Area:** Database
- **Depends on:** P0-DB-06, P0-DB-08
- **Acceptance:** Write `(section_id, subject_id)` via `teacher_sections`;
  class-teacher section-wide read; helpers `current_teacher_id()` /
  `current_identity_id()`. Nest guards are defense-in-depth, not a substitute.

### P0-DB-10 — `audit_log`
- **Area:** Database
- **Depends on:** P0-DB-01
- **Acceptance:** Append-only; no SELECT for standard roles.

---

## Database / Seed (local School X fixture)

Covers every table already created by Phase 0 migrations. Goal: after
`pnpm db:reset` (+ auth provision script), local login and calendar E2E work
without hand-inserts. Passwords never in Postgres. No `confirmed`
`student_outcomes`. `audit_log` intentionally unseeded. Rich yearly-map
content remains Phase 1 (`P1-DB-01`).

### P0-SEED-01 — Calendar draft in `seed.sql`
- **Area:** Database
- **Depends on:** P0-DB-03, P0-DB-04
- **Acceptance:** Expand [`packages/db/supabase/seed.sql`](../../../packages/db/supabase/seed.sql)
  with School X `school_calendars` (draft, not approved), three `terminals`
  (start/end/`reporting_type` only — **no test-date**), and festival-template
  `calendar_closures`. Existing `schools` + `sections` rows remain.
  `teaching_days` VIEW yields a non-zero count per terminal after insert.
- **Notes:** `bands` / `grade_scales` / placeholder `outcomes` already seeded
  in migration — verify present on reset; do not duplicate.

### P0-SEED-02 — Children + guardians
- **Area:** Database
- **Depends on:** P0-DB-01
- **Acceptance:** 2–3 `children` in UKG A; matching `guardians` +
  `guardian_child_links`. Guardians have membership rows but no web login
  (`auth_user_id` NULL).

### P0-SEED-03 — Teacher, admin membership, `teacher_sections`
- **Area:** Database
- **Depends on:** P0-DB-06, P0-SEED-02
- **Acceptance:** SQL inserts for `identities` (as `invited` until P0-SEED-04),
  `school_memberships` (one `admin`, one `teacher`), `school_admins`,
  `teachers`, and `teacher_sections` with `subject_id` NULL,
  `is_class_teacher = true` for UKG A.
- **Notes:** `subjects` / `band_subjects` intentionally empty at pre_primary.

### P0-SEED-04 — Auth-linked seed script
- **Area:** DevOps
- **Depends on:** P0-SEED-03, P0-API-AUTH-01
- **Acceptance:** `scripts/seed-dev-auth.mjs` (or documented curl flow) creates
  Supabase Auth users, sets `identities.auth_user_id`,
  `account_status = active`, prints known local credentials (e.g.
  `admin@schoolx.dev`). **Never** store password hashes in Postgres.
- **Refs:** `.cursor/rules/authentication.mdc`

### P0-SEED-05 — Pedagogy sample rows
- **Area:** Database
- **Depends on:** P0-SEED-02, P0-SEED-03, P0-DB-08
- **Acceptance:** 1–2 `attendance_record` days; exactly one
  `student_outcomes` row with `state = proposed` only (no confirmed).

### P0-SEED-06 — Map / progress stubs
- **Area:** Database
- **Depends on:** P0-SEED-01, P0-DB-07
- **Acceptance:** One `yearly_map` (`status = draft`) for School X calendar /
  UKG A; optional empty `map_slices`; `lesson_progress` may stay empty.
  Full theme×teaching-day fixture is Phase 1.

### P0-SEED-07 — `substitute_access` example
- **Area:** Database
- **Depends on:** P0-SEED-03
- **Acceptance:** At least one time-bounded `substitute_access` row
  (prefer one expired + one future/active for guard smoke tests).

### P0-SEED-08 — Seed verification checklist
- **Area:** Testing
- **Depends on:** P0-SEED-01 … P0-SEED-07
- **Acceptance:** After `db:reset` + auth script, assert expected row counts
  for all Phase 0 tables; document intentional empties:
  `subjects`, `band_subjects`, `audit_log` (and `lesson_progress` if unused).
  `teaching_days` is a VIEW — count derived days, do not insert.

---

## Backend (NestJS)

### P0-API-SWAGGER-01 — Wire `@nestjs/swagger`
- **Area:** Backend
- **Depends on:** —
- **Acceptance:** `/api/docs` UI; `/api/docs-json` export at bootstrap.
- **Refs:** `.cursor/rules/api-documentation.mdc`

### P0-API-AUTH-01 — `AuthProviderPort` + `SupabaseAuthAdapter`
- **Area:** Backend
- **Depends on:** P0-DB-02
- **Acceptance:** Adapter implements sign-in, invite, create-user, set-password.

### P0-API-AUTH-02 — `resolveIdentifierToEmail`
- **Area:** Backend
- **Depends on:** P0-API-AUTH-01
- **Acceptance:** Email passthrough; synthetic email for mobile-only; synthetic
  never stored in `identities.email`.

### P0-API-AUTH-03 — `POST /auth/login`
- **Area:** Backend
- **Depends on:** P0-API-AUTH-02
- **Acceptance:** Resolves identifier → `signInWithPassword`; returns session.

### P0-API-AUTH-04 — Invite flow
- **Area:** Backend
- **Depends on:** P0-API-AUTH-01
- **Acceptance:** Email → `inviteByEmail`; mobile → hashed token + WhatsApp/SMS
  stub; `accept-invite` sets password + `auth_user_id`.

### P0-API-AUTH-05 — Recovery OTP
- **Area:** Backend
- **Depends on:** P0-API-AUTH-01
- **Acceptance:** `request-recovery-otp` + `verify-recovery-otp-and-set-password`
  via Admin API (bypass email reset).

### P0-API-AUTH-06 — `SupabaseAuthGuard`
- **Area:** Backend
- **Depends on:** P0-API-AUTH-03
- **Acceptance:** Bearer → identity → membership + teacher/admin; before RBAC.

### P0-API-AUTH-07 — `RequireRole('admin')`
- **Area:** Backend
- **Depends on:** P0-API-AUTH-06
- **Acceptance:** Active `member_type = 'admin'`; does **not** skip two-grain.

### P0-API-RBAC-01 — Two-grain guards + decorator
- **Area:** Backend
- **Depends on:** P0-API-AUTH-06, P0-DB-09
- **Acceptance:** `SectionSubjectWriteGuard`, `SectionReadGuard`,
  `SubstituteRoleGuard`, `@RequireSectionSubjectScope()`.

### P0-API-RBAC-02 — `AdminGravityRuleInterceptor`
- **Area:** Backend
- **Depends on:** P0-API-AUTH-07
- **Acceptance:** Strips beyond counts/shapes on admin responses (default-on).

### P0-API-CAL-01 — `CalendarModule` endpoints
- **Area:** Backend
- **Depends on:** P0-DB-03, P0-DB-04, P0-API-AUTH-07, P0-API-SWAGGER-01
- **Acceptance:** `setup`, festival GET/PATCH, `approve`, `teaching-days`
  (reads VIEW). Fully Swagger-decorated (reference module).

### P0-API-BAND-01 — `BandConfigModule` + pre_primary seed
- **Area:** Backend
- **Depends on:** P0-DB-05
- **Acceptance:** Seed/read `bands`/`grade_scales`/`subjects` for pre_primary only.

### P0-API-CI-01 — Rank-order query lint
- **Area:** Testing
- **Depends on:** —
- **Acceptance:** CI fails on ORDER BY over rating/%/letter-grade across children/teachers.

### P0-API-CI-02 — RLS coverage tests
- **Area:** Testing
- **Depends on:** P0-DB-09
- **Acceptance:** Tables with `child_id`/`section_id`/`teacher_id` have grain tests;
  deliberately broken policy fixture fails CI.

---

## Frontend

### P0-WEB-01 — Vite + Svelte 5 + Tailwind scaffold
- **Area:** Frontend
- **Depends on:** —
- **Acceptance:** SPA builds and runs (no SvelteKit SSR).

### P0-WEB-02 — `generate:api-types`
- **Area:** Frontend
- **Depends on:** P0-API-SWAGGER-01
- **Acceptance:** `openapi-typescript` → `apps/web/src/lib/shared/api/generated-types.ts`;
  CI fails on contract mismatch.

### P0-WEB-03 — Keenmate router + session
- **Area:** Frontend
- **Depends on:** —
- **Acceptance:** `@keenmate/svelte-spa-router`; `router/routes.ts`,
  `permissions.ts`, `lib/shared/stores/session.ts`.

### P0-WEB-04 — Admin calendar wizard
- **Area:** Frontend
- **Depends on:** P0-API-CAL-01, P0-WEB-02, P0-WEB-03, P0-WEB-05
- **Acceptance:** Session/terminals → festival review → approve.

### P0-WEB-05 — Login + recovery UI
- **Area:** Frontend
- **Depends on:** P0-API-AUTH-03, P0-API-AUTH-05, P0-WEB-03
- **Acceptance:** Username + password login; forgot-password → recovery OTP
  (never WhatsApp-only login).

---

## DevOps

### P0-OPS-01 — Supabase project (in-region)
- **Area:** DevOps
- **Depends on:** —
- **Acceptance:** Project in Mumbai or Singapore (manual); local stack for E2E.

### P0-OPS-02 — CI pipeline
- **Area:** DevOps
- **Depends on:** P0-API-CI-01, P0-API-CI-02
- **Acceptance:** Lint, typecheck, RLS tests, rank-order lint on every PR.

### P0-OPS-03 — `.env` secrets hygiene
- **Area:** DevOps
- **Depends on:** —
- **Acceptance:** No client-side service-role keys; stale app-JWT/bcrypt vars removed.
