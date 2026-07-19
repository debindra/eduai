# PHASE_TASKS.md — Granular Development Tasks by Phase

Companion to `PROJECT_PLAN.md` (the narrative roadmap) — this is the
issue-tracker-ready breakdown, mapped to NestJS modules/guards/interceptors
per `ARCHITECTURE.md`. Copy sections into your tracker of choice (Linear/Jira/GitHub
Projects) as-is; each bullet is sized to be one ticket.

**Detailed tickets + live status:** [`docs/phases/`](docs/phases/) —
[`tasks/`](docs/phases/tasks/) for acceptance criteria, [`status/`](docs/phases/status/)
for progress, [`status/SUMMARY.md`](docs/phases/status/SUMMARY.md) for the board.
New tickets land here first, then expand under `docs/phases/`.

Assumption confirmed: frontend tasks below assume a Svelte 5 SPA (Vite,
not SvelteKit — no SSR, no `load` functions) + Tailwind, per
`ARCHITECTURE.md` Part 2.

All Frontend task bullets below assume the structure defined in
`ARCHITECTURE.md` Part 2 (one app, role-based route groups, feature
folders mirroring backend modules) — create the feature folder as part of
each Frontend bullet, don't scaffold it separately.

---

## Phase 0 — Foundations

### Database / Schema (Supabase Postgres)
- [x] `schools`, `identities`, `school_memberships`, actor profiles
      (`teachers`, `school_admins`, `guardians`), `sections`, `children`
- [x] `identities` auth columns — `auth_user_id` (links to `auth.users`),
      `email` (nullable, unique, real emails only), `phone`,
      `account_status` (`invited` | `active` | `disabled`), invite fields
      for mobile-only — see
      `packages/db/supabase/migrations/20250718120000_identity_tenant_auth.sql`.
      Passwords live in Supabase Auth; never store `password_hash` in
      Postgres. Admin gate is `school_memberships.member_type = 'admin'`.
- [x] `school_calendars`, `terminals` (boundaries only — no test-date column,
      ever), `calendar_closures`
- [x] `teaching_days` as a **view**, not a table — recomputed on read
- [x] `bands`, `subjects`, `band_subjects`, `outcomes`, `grade_scales`
- [x] `teacher_sections` (the RBAC backbone — `subject_id` nullable,
      `is_class_teacher` boolean)
- [x] `yearly_map`, `map_slices`, `lesson_progress`
- [x] `student_outcomes` (pre-primary-sufficient slice — `attempt` ENUM
      added in Phase 3), `attendance_record`
- [x] RLS policies: two-grain enforcement (`(section_id, subject_id)` write,
      section-wide class-teacher read) — write as SQL policies using
      `current_teacher_id()` / `current_identity_id()`, **and** write the
      corresponding NestJS guard (see Backend below) as defense-in-depth,
      not a substitute for RLS
- [x] `audit_log` table (append-only, excluded from every role's standard
      query surface)

### Seed (local School X fixture)
- [x] Calendar draft in `seed.sql`: `school_calendars` + 3 `terminals` +
      festival-template `calendar_closures` (draft, not approved);
      verify migration seeds for `bands` / `grade_scales` / placeholder
      `outcomes` — see `P0-SEED-01`
- [x] 2–3 `children` in UKG A + `guardians` + `guardian_child_links`
      (`P0-SEED-02`)
- [x] Admin + teacher `identities` / `school_memberships` /
      `school_admins` / `teachers` + `teacher_sections`
      (`subject_id` NULL, class teacher) — `P0-SEED-03`
- [x] Auth-linked seed script (`scripts/seed-dev-auth.mjs` or curl):
      Supabase Auth users → `auth_user_id` + `account_status = active`;
      known local password; never store password hashes — `P0-SEED-04`
- [x] Pedagogy samples: attendance rows + one `student_outcomes` with
      `state = proposed` only (no confirmed) — `P0-SEED-05`
- [x] Map stubs: one draft `yearly_map` (+ optional empty `map_slices`);
      rich content stays Phase 1 — `P0-SEED-06`
- [x] `substitute_access` time-bounded example row(s) — `P0-SEED-07`
- [x] Seed verification checklist after `db:reset` + auth script;
      intentional empties: `subjects`, `band_subjects`, `audit_log` —
      `P0-SEED-08`

### Backend (NestJS)
- [x] `AuthModule` — Admin + Teacher only, username (email or mobile) +
      password via Supabase Auth. See `ARCHITECTURE.md` Part 1,
      "Authentication," for the full design:
  - [x] `SupabaseAuthAdapter implements AuthProviderPort`
  - [x] `AuthService.resolveIdentifierToEmail()` — email passthrough vs.
        synthetic-email mapping for mobile-only accounts
  - [x] `POST /auth/login` — resolves identifier, calls
        `signInWithPassword`
  - [x] Invite flow: `inviteByEmail()` (Supabase built-in) for accounts
        with a real email; custom hashed-token + WhatsApp/SMS delivery for
        mobile-only accounts, with an `accept-invite` endpoint that sets
        the password and populates `identities.auth_user_id`
  - [x] Recovery/2FA: `request-recovery-otp` (WhatsApp primary, SMS
        fallback) + `verify-recovery-otp-and-set-password` (direct
        `admin.updateUserById` call, bypassing Supabase's email reset flow)
  - [x] `SupabaseAuthGuard implements CanActivate` — resolves bearer token
        to an `identities` row, then membership + teacher/admin profile;
        runs before any RBAC guard on every protected route
  - [x] `RequireRole('admin')` guard/decorator — checks active
        `school_memberships.member_type = 'admin'`; explicitly NOT a
        substitute for the two-grain scope guards below
- [x] `RbacModule` housing the two-grain guards:
  - [x] `SectionSubjectWriteGuard implements CanActivate` — mirrors the
        `student_outcomes_write_subject_scope` RLS policy
  - [x] `SectionReadGuard implements CanActivate` — section-wide read
  - [x] `SubstituteRoleGuard` — hard-blocks confirmation writes for the
        substitute role at the application layer, not just hidden in UI
  - [x] Custom `@RequireSectionSubjectScope()` decorator wiring these guards
        onto controller methods declaratively
- [x] `AdminGravityRuleInterceptor implements NestInterceptor` — strips
      anything beyond counts/shapes from admin-scoped responses before
      serialization
- [x] `CalendarModule`: `CalendarController`, `CalendarService`,
      `CalendarRepository` (thin controller → service → repository layering)
  - [x] `POST /calendar/:schoolId/setup` — session start, terminal
        boundaries, weekly offs
  - [x] `GET /calendar/:schoolId/festival-template` +
        `PATCH .../festival-template` — accept/edit pre-filled closures
  - [x] `POST /calendar/:schoolId/approve` — the one-approval action that
        configures everything downstream
  - [x] `GET /calendar/:schoolId/teaching-days` — reads the view, never a
        cached count
- [x] `BandConfigModule`: seed script for `bands`/`grade_scales`/`subjects`
      rows (pre_primary only for now — Grades 1–3/4–5 rows land in Phase 3/4)
- [x] Wire `@nestjs/swagger`: `SwaggerModule.setup('api/docs', app, document)`
      at bootstrap, spec exported at `/api/docs-json`
- [x] Fully decorate `CalendarModule`'s controller + DTOs
      (`@ApiTags`/`@ApiOperation`/`@ApiResponse`/`@ApiProperty` on every
      endpoint and field) — this is the reference example every later
      module's decoration should match; see `ARCHITECTURE.md` Part 1
- [x] CI: rank-order query lint (ESLint custom rule or a grep-based CI step
      per the original rank-order lint script — port the logic, keep the check)
- [x] CI: RLS coverage test — every new table referencing
      `child_id`/`section_id`/`teacher_id` must have a corresponding test
      asserting both grains

### Frontend (Svelte 5 SPA + Tailwind)
- [x] Vite + Svelte 5 project scaffold, Tailwind configured
- [x] `openapi-typescript` wired as a script (`pnpm generate:api-types`)
      reading the backend's `/api/docs-json`, output to
      `apps/web/src/lib/shared/api/generated-types.ts`; run in local dev
      and CI so a backend/frontend contract mismatch is a build failure
- [x] `@keenmate/svelte-spa-router` wired: `router/routes.ts` (route table),
      `router/permissions.ts` (`configurePermissions`/`checkPermissions`/
      `onUnauthorized`), driven by `lib/shared/stores/session.ts` — this is
      the one piece of frontend plumbing everything else depends on
- [x] Admin calendar-setup wizard: session/terminal entry → festival
      template review → approve — this is the entire Phase 0 admin surface
- [x] Login screen: username (email or mobile) + password, calling
      `POST /auth/login`; "forgot password" flow triggers the WhatsApp/SMS
      recovery-OTP path, never a WhatsApp-only login

### DevOps
- [x] Supabase project provisioned (in-region: Mumbai or Singapore) —
      runbook at `docs/ops/supabase-cloud-provision.md` (operator creates
      hosted project at deploy; local Docker is Phase 0 default)
- [x] CI pipeline: lint, typecheck, RLS tests, rank-order lint, on every PR
- [x] `.env` secrets management wired (never client-side keys)

**Exit criteria:** one school's calendar can be entered, festival-adjusted,
and approved end to end; `teaching_days` returns a real per-terminal count;
CI blocks a deliberately-broken RLS policy and a deliberately-added
rank-order query in a test PR.

---

## Phase 1 — Band-as-data core + pre-primary happy path

### Database / Schema
- [ ] Seed the yearly-map generator's output tables with a real School X
      test fixture (theme/chapter sequence × teaching days)
- [ ] Confirm `map_slices.outcome_refs` FK integrity against seeded
      pre-primary `outcomes` rows (even placeholder/test content — real
      content is still trainer-gated per open items)

### Backend (NestJS)
- [ ] `YearlyMapModule`: deterministic placement service (no AI call) —
      distributes curriculum sequence across a terminal's teaching days,
      theme-led, with a consolidation window at terminal close
- [ ] `PlanningCascadeModule`: monthly (auto-derived) → weekly (teacher
      adjusts Sunday) → daily (pre-filled from weekly cell) resolvers
- [ ] `LessonModule`: `POST /lessons/generate` — calls `AiOrchestrationModule`
      (Haiku) grounded in that day's `map_slice` + book position; 5E vs.
      explicit-instruction pedagogy selection is a rule, not a model choice
- [ ] `AiOrchestrationModule`: prompt-template lookup by `(feature, band)`
      from a DB table, not inlined strings; model-tier router (Haiku vs.
      Sonnet vs. none) per the routing table in `CLAUDE.md`
- [ ] `AttendanceModule`: one-tap attendance, WhatsApp confirmation ping to
      guardians
- [ ] `OutcomesModule`: the four capture paths (batch sweep, carry-forward,
      voice/text observation mapper, assessment-activity rubric), all
      converging on one confirm-gated write path
  - [ ] Mapper guard tests (automated, must fail if weakened):
        no top-band jump from one sighting; ambiguous names → roll-number
        candidates; non-observation → attendance, not an outcome; nothing
        writes without explicit confirmation
- [ ] `PacingModule`: `GET /pacing/:sectionId` — planned vs. actual position
      from `lesson_progress`, pacing gap in teaching days, three states
      (on track / behind / self-correcting)
- [ ] `CoachModule`: classroom-coach chat endpoint (Haiku, ~20s target,
      private — never joined to a child record, excluded from handover
      snapshots)
- [ ] `ReportsModule`: monthly parent report generation (Sonnet), teacher
      review/approve step, neutral-fallback path for thin data

### Frontend
- [ ] Teacher web sweep: milestone batch-sweep UI (monthly, ~5 min/class)
- [ ] Weekly plan review/adjust screen (Sunday glance)
- [ ] Daily lesson view (pre-filled, editable)
- [ ] Pacing indicator (three-state badge, teaching-days-remaining readout)
- [ ] Parent-report review/approve screen (evidence shown beside draft)

### AI / Prompts
- [ ] Load prompt templates #1 (outcome mapper), #2 (coach), #4 (lesson
      generator) from `/prompts/ai-prompt-templates.md` into the DB-backed
      `(feature, band)` table
- [ ] Wire output validators per template (guard checks, no-label/no-rank
      checks) as a post-generation pipeline step, not just prompt wording

### Testing / CI
- [ ] Seed test: Dashain-length closure reflows `map_slices` and pacing
      state without a manual re-plan (self-correcting state)
- [ ] Seed test: stalled milestone (unmoved for N weeks) triggers the
      inclusive-assistant private prompt, not an admin-visible flag

**Exit criteria:** a pilot class runs attendance → auto-derived daily
lesson → milestone capture → monthly report for a full month with no
manual data-fixing; coverage (`lesson_progress`) and learning
(`student_outcomes`) never merge into one status anywhere in the UI.

---

## Phase 2 — Pre-primary compliance + school/parent layers

### Backend (NestJS)
- [ ] `DocGenModule` (consider as a separately deployed Nest microservice
      per the architecture's isolation rationale — fonts-noto-core +
      landscape-orientation fix shouldn't leak into the main API image):
  - [ ] Assessment log book (deterministic render)
  - [ ] Year-end developmental report (Sonnet-drafted, teacher-approved)
  - [ ] Transition file (deterministic)
  - [ ] Inspection pack (batch invocation of the same per-document renders)
- [ ] `AdminModule`: dashboard endpoints returning only
      `AdminGravityRuleInterceptor`-shaped data (coverage, not
      distributions) — plus the pacing altitude (sections-behind, never a
      teacher league table)
- [ ] `ManageModule`:
  - [ ] First-month settling programme content/scheduling
  - [ ] Substitute pack — `SubstituteRoleGuard` blocks rating/confirmation
        at the guard layer, not just hidden in the substitute's UI
  - [ ] Catch-up pack — a query over `lesson_progress` joined to
        `attendance_record`, not a new content pipeline
  - [ ] Festival/event planner reading `calendar_closures` directly
- [ ] `MessagingModule`: two-way WhatsApp threading per family, FAQ-bot
      routing, teacher-queue routing with drafted replies, admin routing
      for fees/complaints
- [ ] `HandoverModule`: materialized `handover_pack` snapshot at teacher
      transition — explicitly excludes coach-chat history (no join exists)
- [ ] Exit/retention endpoints: full per-child export, leaving packs,
      deletion-after-window job

### Frontend
- [ ] Admin compliance dashboard (adoption, coverage, pacing, communication
      timeliness — all counts/shapes)
- [ ] Two-way messaging inbox (teacher + admin views, separate queues)
- [ ] PTM-prep and event-planner screens
- [ ] Parent portal: six-domain picture + portfolio, viewable anytime, band
      history on request

### Testing / CI
- [ ] Full Curriculum-2077 compliance cycle test: assessment log → year-end
      report → transition file → inspection pack, all traceable to source
      rows via `document_render.source_row_hash`

**Exit criteria:** a full compliance cycle is producible on demand for a
pilot section; substitute-mode confirmation is provably blocked (test
asserts a 403/guard rejection, not just a hidden button).

---

## Phase 3 — Grades 1–3 extension

### Database / Schema
- [ ] `basic_early` row in `bands` (four_level, E–A+ `grade_scales`)
- [ ] `student_outcomes.attempt` ENUM (`regular` / `after_support`) added
      — regular-pass value immutable, re-assessment inserts a new row
- [ ] `remedial_plans` table — first-class lifecycle object, not a status
      flag on `student_outcomes`

### Backend (NestJS)
- [ ] Populate `teacher_sections.subject_id` for real subject rotation;
      **write a test proving the two-grain RLS/guard model collapses
      correctly to the pre-primary case with zero code changes** — this is
      the actual validation that Phase 1's foundation was built right
- [ ] `RemedialModule`: state machine (Opened → Activity delivered →
      Re-assessed → Escalated → Closed), implemented as a NestJS provider
      with explicit state-transition methods, not an implicit status field
  - [ ] Job scheduling for re-assessment reminders (quiet-hours aware) —
        Inngest/Trigger.dev triggered via a Nest webhook controller
  - [ ] Escalation path: repeated below-basic on `after_support` →
        `upcharatmak`, class-teacher notified regardless of rating subject
        teacher, logged to trainer review queue
- [ ] `AggregationModule`: deterministic `Σ ÷ (4 × n) × 100` → letter grade
      — pure computation, zero AI cost, recomputed live on read
- [ ] `DocGenModule` extension: Annex 2/3/4 deterministic templates;
      confirm fonts-noto-core + landscape-orientation fix are in the
      doc-rendering service's base image before the first real render
- [ ] `MethodsToolkitModule`: generation-menu config (method → activity
      generator + tool template + observation prompt), tagged with official
      method names

### Frontend
- [ ] Subject-teacher view: subject-scoped write, section-wide read
- [ ] Class-teacher oversight view: whole-child read across subjects,
      report-assembly approval screen (pending subject drafts visible)
- [ ] Remedial-loop tracker (teacher-facing: open loops for her students;
      admin-facing: open/closed counts only, never named)

### Testing / CI
- [ ] Full remedial-loop test: rating → below-basic → activity generated →
      re-assessed → closed or escalated, admin open-loop count accurate
      throughout
- [ ] Cross-domain contamination test: a subject teacher literally cannot
      write outside her own subject's outcomes (guard + RLS both reject it)

**Exit criteria:** a Grade 1–3 pilot section runs a full remedial loop
end to end with accurate admin-visible open-loop counts.

---

## Phase 4 — Grades 4–5 extension (content-gated)

**Do not start engineering work here until the Grades 4–5 outcomes bank is
confirmed by trainers/ECE specialist — this phase is gated on content, not
code, per the architecture doc's own flag.**

### Database / Schema
- [ ] `basic_upper` row in `bands` (four_level, NG–A+ `grade_scales`)
- [ ] `band_subjects` rows for the seven-subject Grade 4–5 list

### Backend (NestJS)
- [ ] Confirm zero code changes required beyond new rows/content — if
      `RemedialModule`, `AggregationModule`, or `DocGenModule` need a code
      branch for this band, that's a regression against Phase 1–3's
      band-as-data foundation; fix the foundation, not this phase
- [ ] Cross-domain contamination guard re-verified specifically for subject
      teachers seeing a child only a few periods/week

### Testing / CI
- [ ] Same remedial-loop and Annex-pipeline tests from Phase 3, run
      unmodified against Grade 4–5 fixtures — driven only by new
      configuration rows

**Exit criteria:** Grade 4–5 pilot section runs the identical Phase 3
pipeline with zero new backend code, only new rows and content.

---

## Phase 5 — Cost, caching, career layer

### Backend (NestJS)
- [ ] Cache-hit-rate monitoring dashboard, remedial-activity cache tracked
      separately (expected highest hit rate in the system)
- [ ] `CertificationModule`: 12-week WhatsApp credential programme, weekly
      quiz scoring, one human-scored observed-teaching-session record
- [ ] Out-of-segment query log (if not already wired from Phase 0/2) — logs
      requests for functionality outside a school's licensed band range as
      a Phase-2-market demand signal

### Frontend
- [ ] Community/moments library screens
- [ ] Certification progress tracker (teacher-facing)

**Exit criteria:** infrastructure cost validated against real pilot usage
before Grades 4–5 pricing is finalized.

---

## Phase 6 — Pilot hardening, security review, launch prep

### Backend / DevOps
- [ ] Staging environment exercising all three band configurations
      simultaneously (one pre-primary, one Grades 1–3, one Grades 4–5
      section minimum)
- [ ] Security review: RLS coverage audit, `SectionSubjectWriteGuard`
      penetration test (attempt cross-subject/cross-section writes and
      confirm rejection), audit-log completeness on every elevated action
- [ ] Consent-gate enforcement audit: photo sharing, school-to-school
      transfer, deletion-on-request — all gated on a stored, checkable flag

### Content / Business
- [ ] 138-milestone pre-primary bank sign-off (trainer/ECE specialist)
- [ ] Nepali/code-switched voice-transcription pilot go/no-go
- [ ] BS↔AD conversion library finalized and load-tested against real
      multi-year calendar edits
- [ ] Working-name replacement across every parent- and school-facing
      artifact before any external commitment

**Exit criteria:** a real pilot school runs a full term on the platform
with no manual data-patching, and every rule in `CLAUDE.md`'s invariants
list has a corresponding automated test, not just a code comment.

---

## Phase 7 — Platform / Super Admin + Nepali calendar redesign

Cross-tenant platform role (not an extension of school `admin`), global
national calendar that auto-applies to every school, and hamropatro-style
BS-primary calendar UI. Full drill-down into a school is only via an
audited, time-boxed `support_session` (gravity rule + consent). Detail:
[`docs/phases/tasks/phase-7-platform-super-admin.md`](docs/phases/tasks/phase-7-platform-super-admin.md).

### Database / Schema
- [ ] `platform_admins` linked to `identities` (no `school_id`) —
      `P7-DB-01`
- [ ] `support_sessions` (reason, school, expiry, status) + drill-down
      writes to `audit_log` — `P7-DB-02`
- [ ] `national_calendars` + `national_closures` (govt_holiday /
      festival / day_off; movable as data, not hardcoded years) —
      `P7-DB-03`
- [ ] Extend `teaching_days` VIEW: exclude published national closures
      **or** per-school `calendar_closures`; still derived — `P7-DB-04`
- [ ] Seed: one platform admin + published national calendar for current
      BS year; `teaching_days` non-zero — `P7-DB-05`

### Backend (NestJS)
- [ ] Platform login → `memberType = 'super_admin'`, `schoolId = null`;
      `RequirePlatformAdminGuard`; fix multi-membership `.limit(1)` gap —
      `P7-API-PLAT-01`
- [ ] `PlatformModule`: `GET /platform/schools` + per-school aggregate
      shapes only (gravity + no rank-order) — `P7-API-PLAT-02`
- [ ] Support sessions + `PlatformSupportSessionGuard` for scoped
      school-admin drill-down — `P7-API-PLAT-03`
- [ ] `NationalCalendarModule` CRUD (super-admin only; deterministic) —
      `P7-API-CAL-NAT-01`
- [ ] School calendar setup auto-applies published national closures;
      drop hardcoded `DEFAULT_FESTIVAL_TEMPLATE`; local closures still
      allowed — `P7-API-CAL-02`
- [ ] Shared `@eduai/bs-date` BS↔AD package (vetted library; pure +
      unit-tested) — `P7-API-BS-01`

### Frontend (Svelte 5 SPA + Tailwind)
- [ ] Shared `NepaliCalendar`: BS date big / AD small; monthly prev/next
      within current BS year only; 12-month overview → enlarge month —
      `P7-WEB-BS-01`
- [ ] Rebuild school `CalendarWizard` on `NepaliCalendar` (multi-terminal,
      local closures) — `P7-WEB-CAL-01`
- [ ] `super_admin` routes + session: monitoring board, national calendar
      editor, support-session entry — `P7-WEB-PLAT-01`
- [ ] Login redirect + `PlatformNav`; school chrome only during active
      support session — `P7-WEB-PLAT-02`

### Suggested additional powers (ticket if needed; not exit-critical)
- [ ] School provisioning (`POST /platform/schools` + invite first admin)
- [ ] Band / grade-config / subjects management
- [ ] AI prompt-template management
- [ ] Per-school licensing / feature flags
- [ ] Cross-school out-of-segment + cache/cost dashboards
- [ ] Audit-log review console (platform read)

### Testing / CI
- [ ] Support-session 403 without session; audit_log on drill-down;
      gravity + rank-order on platform endpoints — `P7-TEST-01`
- [ ] National closure reflows `teaching_days` (national + local) —
      `P7-TEST-02`
- [ ] BS↔AD conversion unit tests across year boundaries — `P7-TEST-03`

**Exit criteria:** a platform super admin can list every school
(aggregates only), open an audited support session and drill into one
school's admin surfaces, maintain a published national calendar that
auto-applies into every school's `teaching_days`, and use a shared
hamropatro-style BS-primary calendar (monthly + 12-month overview) in
both platform and school-admin UIs.

---

## Phase 8 — ECA / CCA catalog + calendar

Platform-owned global ECA/CCA catalog (with icons); school admin
enables catalog items or adds school-only items and places them on the
school calendar. ECA/CCA remain board markers only (do not subtract from
`teaching_days`). Minimal scope — no participation, staff assignment, or
parent views. Detail:
[`docs/phases/tasks/phase-8-eca-cca.md`](docs/phases/tasks/phase-8-eca-cca.md).

### Database / Schema
- [x] `eca_cca_catalog` (global name, kind, icon_key allowlist, active,
      soft-delete) + RLS — `P8-DB-01`
- [x] `school_eca_cca_items` (enable catalog or school-only) + RLS —
      `P8-DB-02`
- [x] `calendar_closures.school_activity_id` nullable FK; CHECK with
      `eca`/`cca` category — `P8-DB-03`
- [x] Seed ~8–12 Nepal-relevant catalog rows; School X enables a subset —
      `P8-DB-04`

### Backend (NestJS)
- [x] Platform `EcaCcaCatalogModule` CRUD (super admin only) —
      `P8-API-CAT-01`
- [x] School admin: list / enable-disable / CRUD school-only —
      `P8-API-SCH-01`
- [x] Calendar closures accept optional `schoolActivityId`; board returns
      icon/kind; `teaching_days` unchanged — `P8-API-CAL-01`

### Frontend (Svelte 5 SPA + Tailwind)
- [x] Platform catalog page + `PlatformNav` link; icon picker —
      `P8-WEB-PLAT-01`
- [x] School manage surface: enable catalog / add-edit-delete school-only —
      `P8-WEB-ADM-01`
- [x] Closure dialog activity picker + icons on calendar board —
      `P8-WEB-CAL-01`

### Testing / CI
- [x] Platform vs school RBAC; school-only isolation — `P8-TEST-01`
- [x] Calendar link + `teaching_days` still ignores ECA/CCA —
      `P8-TEST-02`
- [x] FE picker + icon-mapping tests — `P8-TEST-03`

**Exit criteria:** platform can maintain the global ECA/CCA catalog with
icons; school admin can enable catalog items or add school-only items and
place them on the calendar with icons; ECA/CCA remain non-teaching-day
markers.

---

## Cross-phase discipline reminders

- Every new NestJS guard/interceptor should have a unit test with a
  deliberately-invalid input (wrong section, wrong subject, substitute
  role) proving it rejects — not just a happy-path test.
- Every new endpoint's controller method and DTOs are fully Swagger-decorated
  before merge — `@ApiTags`/`@ApiOperation`/`@ApiResponse`/`@ApiProperty`,
  with Propose/Confirm semantics and guard/scope requirements stated in the
  operation description. This isn't documentation polish — it's what
  `generate:api-types` reads to keep the frontend honest.
- Every new admin-facing endpoint goes through `AdminGravityRuleInterceptor`
  by default — opt out explicitly and document why, don't opt in per
  endpoint.
- Every new AI generation path gets a template row in the `(feature, band)`
  prompt table before it ships, per `/prompts/ai-prompt-templates.md`'s
  review checklist.
