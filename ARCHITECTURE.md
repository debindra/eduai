# ARCHITECTURE.md — Current System Architecture

This is the single source of truth for how EduAI Nepal's codebase is
structured, backend and frontend. It describes the system **as it stands
today** — there is no decision history to trace, no prior version to read
first. If this file and anything else in the repo disagree, this file wins;
update it in the same PR that changes the architecture.

(The product/domain spec — what the system does and why — lives in
`docs/specs/` and is summarized in `CLAUDE.md`. This file is about how the
code is organized to build that spec.)

---

## Part 1 — Backend (NestJS)

### Pattern: modular layered monolith, bounded-context modules

Each NestJS module is a bounded context. Inside a module: `Controller`
(thin) → `Service` (business/domain logic) → `Repository` (data-access
interface + Supabase-backed implementation). Plain three-layer
architecture — not full DDD (no value-object wrapping of primitives, no
aggregate purism, no domain-event bus), not CQRS/event sourcing, not
microservices (the one exception is `DocGenModule` — see below).

The domain here is genuinely complex (band-as-data, calendar/curriculum
separation, a remedial-ladder lifecycle, two-grain RBAC, deterministic vs.
AI-generated content), but the model is already specified in detail by
`docs/specs/`. The job is disciplined implementation of a known model, not
domain discovery — which is why the heavier DDD/CQRS tooling isn't worth
its overhead here.

### Four patterns to apply, not improvise variations of

**1. Propose/Confirm split for any AI-originated write.** A service method
never both calls the AI orchestration layer *and* writes to a table like
`student_outcomes` or `remedial_plans`. Split it:

```ts
// OutcomesService
async proposeOutcome(observation: ObservationInput): Promise<OutcomeProposal> {
  // calls AiOrchestrationModule, returns a candidate — NEVER writes
}

async confirmOutcome(proposalId: string, teacherId: string, edits?: Partial<OutcomeProposal>): Promise<StudentOutcome> {
  // guarded by SectionSubjectWriteGuard; the ONLY method that writes
}
```
This is how "the level is human" gets enforced structurally instead of by
convention.

**2. Explicit state machines for lifecycle objects.** `remedial_plans`,
`handover_pack` assembly, and certification progress all go through a
dedicated transition service — never a status field mutated from a
controller or an unrelated service:

```ts
// RemedialStateMachineService
transition(plan: RemedialPlan, event: RemedialEvent): RemedialPlan {
  // Opened -> ActivityDelivered -> ReAssessed -> (Escalated | Closed)
  // invalid transitions throw — never silently no-op
}
```

**3. Config-driven strategy/registry selection — never a band `if`
branch.** Document rendering, prompt-template selection, and anything else
that varies by band or document type resolves through a small
registry/strategy interface keyed by a config row:

```ts
interface DocumentRenderer {
  render(sourceRows: unknown): Promise<Buffer>;
}
// DeterministicRenderer, AiAssistedThenApprovedRenderer — selected via a
// documentType -> renderer lookup table, never a switch statement.
```

**4. Ports & Adapters, narrowly, for external systems only.** WhatsApp
Cloud API, the Anthropic API, Upstash Redis, Cloudflare R2, Twilio/MSG91 —
each behind an interface (`MessagingProviderPort`, `AiProviderPort`,
`CachePort`, `StoragePort`, `OtpFallbackPort`) in `shared/ports/`, with a
concrete adapter injected via NestJS DI. Do not apply this pattern to
communication between your own modules — that's plain service injection.

### The one cross-module rule that matters most

**A module may inject and call another module's service. A module must
never inject or query another module's repository.** This is what keeps
the gravity rule and "no business logic in a channel" real at the code
level, and it's what makes extracting a module into a separate deployable
later (if the team ever needs to) a deployment change rather than a
redesign.

### Backend folder structure

```
apps/api/src/modules/
  calendar/
    calendar.module.ts
    calendar.controller.ts
    calendar.service.ts
    calendar.repository.ts        # interface + Supabase impl
    dto/
    calendar.service.spec.ts
  band-config/
  outcomes/
    outcomes.module.ts
    outcomes.controller.ts
    outcomes.service.ts           # proposeOutcome() / confirmOutcome() split
    outcomes.repository.ts
    outcomes-mapper.service.ts    # the four mapper guards live here
    dto/
  remedial/
    remedial.module.ts
    remedial-state-machine.service.ts
    remedial.repository.ts
  rbac/
    guards/
      section-subject-write.guard.ts
      section-read.guard.ts
      substitute-role.guard.ts
    interceptors/
      admin-gravity-rule.interceptor.ts
    decorators/
      require-section-subject-scope.decorator.ts
  ai-orchestration/
    prompt-template-registry.service.ts
    model-router.service.ts
    adapters/
      anthropic.adapter.ts        # implements AiProviderPort
  messaging/
    adapters/
      whatsapp-cloud-api.adapter.ts  # implements MessagingProviderPort
      twilio-sms.adapter.ts          # implements OtpFallbackPort
  docgen/                          # separately deployed Nest app — see below
  jobs/
  auth/
  admin/
shared/
  ports/                           # interfaces for external systems, shared across modules
```

**`DocGenModule` is the one exception to "modular monolith."** It's a
separately deployed Nest app for rendering-environment reasons (Devanagari
`fonts-noto-core`, the docx landscape-orientation quirk) — not because of
scale. Don't generalize this into "we're doing microservices" for any
other module without an equally concrete technical reason.

### API documentation: Swagger/OpenAPI

`@nestjs/swagger` is wired at bootstrap:
`SwaggerModule.setup('api/docs', app, document)`, with the underlying spec
exported as JSON at a stable path (`/api/docs-json`). That JSON, not the
human-readable UI, is the actual contract — it's what frontend type
generation reads from (see Part 2, rule 7).

**Conventions, applied to every endpoint, not just documented in prose:**

- Every controller is `@ApiTags(<boundedContext>)` — one tag per module,
  matching the folder name (`calendar`, `outcomes`, `remedial`, ...).
- Every controller method has `@ApiOperation({ summary, description })`
  and `@ApiResponse()` for each real response shape (success and error).
- Every request/response DTO is a decorated class
  (`@ApiProperty()`/`@ApiPropertyOptional()` on every field) — never a
  plain TypeScript `interface` or inferred type at an endpoint boundary.
  Swagger can only be as accurate as the DTOs are decorated; an
  undecorated DTO produces an empty or misleading schema, which is worse
  than no spec at all because it looks authoritative and isn't.
- **The Propose/Confirm split (Part 1, pattern 1) is stated explicitly in
  the operation description**, not left implicit: e.g. `proposeOutcome`'s
  `@ApiOperation` description says "Returns a candidate only — never
  writes. Call confirmOutcome to persist." This keeps the invariant
  visible at the contract layer, where a frontend engineer or an agent
  integrating against the API will actually see it.
- **Guard/scope requirements are stated in the operation description.**
  NestJS Swagger doesn't infer custom guard semantics from
  `@UseGuards(SectionSubjectWriteGuard)` — say it in words: "Requires a
  `teacher_sections` row for this section matching either the target
  subject or `is_class_teacher = true`."
- A module's controller + DTOs being fully Swagger-decorated is part of
  that module's definition of done — same standing as its mapper-guard
  tests or RLS coverage test, not an optional polish pass.

**Closing the type-drift gap (Part 2, rule 7):** frontend types are
generated from the exported OpenAPI JSON via `openapi-typescript`, not
hand-written per feature. Output lands at
`apps/web/src/lib/shared/api/generated-types.ts`; feature `types.ts` files
import from there rather than redeclaring a backend response shape. This
runs as a script (`pnpm generate:api-types`), wired into local dev and CI
— if the backend and the generated types disagree, that's a build failure,
not a runtime surprise discovered later.

### Authentication

**Scope: Admin and Teacher only.** Guardians (parents) have no web account
and no password — they remain entirely WhatsApp-native, "self-created only
via WhatsApp handshake anchored to a child" (per the System Report). Nothing
in this section applies to guardians; no guardian-related table gets an
auth column. **Open tension, not yet resolved:** the System Report also
describes parents viewing their child's picture/portfolio "anytime on the
web portal" — if that's still built, it needs its own access mechanism
(e.g. a WhatsApp-issued magic link, no password, no account), separate
from everything in this section. See `CLAUDE.md` 7 open items — don't
build parent web access under an assumed mechanism without confirming.

**Primary: username (email or mobile) + password, via Supabase Auth.**
**Secondary: phone/WhatsApp OTP, for account recovery and 2FA only — never
the sign-in mechanism itself.** This is a deliberate reversal of the
original phone-as-primary-identity design for the *web* login specifically;
WhatsApp's own channel (the bot conversation) is unaffected and still
identifies a teacher by phone number, because that's inherent to how
WhatsApp works as a channel — this section is about `apps/web` login only.

**No self-registration.** There is no public sign-up endpoint. An
`identities` row (plus membership + teacher/admin profile) is always
created by an admin first (roster provisioning), with
`account_status = 'invited'`. The person sets their own password via an
invite flow before they can log in.

**The mobile-as-username problem, and how it's resolved:** Supabase Auth's
password flow is natively email-based. A mobile-only account is handled
via a **synthetic email mapping**, entirely internal — the person never
sees it, types it, or is told it exists:

```
synthetic_email = `${digitsOnly(mobileNumber)}@phone.eduai.internal`
```

`AuthService.resolveIdentifierToEmail(identifier)` checks whether the
submitted "username" looks like an email or a mobile number and returns
the right value (the real email, or the synthetic one) before calling
Supabase Auth. This synthetic value is **never** written to
`identities.email` (that column is real-emails-only, nullable) — it exists
only as an ephemeral value passed to the Supabase Auth call.

**Identity + tenant graph:** credentials live in Supabase Auth
(`auth.users`). App rows are `identities` (link via `auth_user_id`, invite
state, real email/phone) → `school_memberships` (identity × school ×
`member_type`) → actor profiles (`teachers`, `school_admins`, `guardians`).
Passwords are never stored in Postgres.

**Roles:** admin is a `school_memberships` row with `member_type = 'admin'`
(profile in `school_admins`). A person may hold both admin and teacher
memberships at the same school. `RequireRole('admin')` gates admin-only
endpoints (e.g. the compliance dashboard). It is **not** a substitute for
the two-grain `teacher_sections` checks
(`SectionSubjectWriteGuard`/`SectionReadGuard`) — an admin still has no
implicit child-data access; the gravity rule applies to admins too.

**Invite flow, two paths depending on whether the person has a real
email:**

| | Has an email | Mobile-only |
|---|---|---|
| Delivery | Supabase Auth's built-in `inviteUserByEmail()` | Custom token (hashed, stored in `identities.invite_token_hash`), delivered via WhatsApp, SMS fallback |
| Accept | Person clicks the emailed link, sets a password | Person opens the link from WhatsApp/SMS, submits the token + a password to a custom endpoint |
| Result | Supabase creates the `auth.users` row automatically | Backend calls Supabase Admin API to create the `auth.users` row (synthetic email) with the submitted password |

Either path ends the same way: `identities.auth_user_id` populated,
`account_status` set to `active`, plus the appropriate
`school_memberships` + profile rows. A `disabled` account (teacher left
the school) is never deleted — `current_identity_id()` /
`current_teacher_id()` in `20250718120000_identity_tenant_auth.sql` treat
non-`active` as a hard fail-closed, independent of whether the underlying
Supabase Auth session is technically still valid.

**Recovery/2FA (the actual role phone plays now):** `AuthService`
requests a WhatsApp OTP (primary) or SMS OTP via Twilio/MSG91 (fallback)
against the account's `identities.phone` — never against email. On
verification, the backend calls the Supabase Admin API directly to set a
new password (`admin.updateUserById`), bypassing Supabase's own
email-based password-reset flow entirely, since the recovery channel here
is phone, not email.

**Ports & Adapters:** `SupabaseAuthAdapter implements AuthProviderPort`
(login, invite, set-password, disable), reusing the existing
`OtpFallbackPort`/`MessagingProviderPort` adapters from Part 1's Ports &
Adapters list for the recovery OTP send/verify step — no new external
integration is introduced, this composes what's already there.

```ts
interface AuthProviderPort {
  signInWithPassword(email: string, password: string): Promise<Session>;
  inviteByEmail(email: string): Promise<void>;
  createUserWithPassword(syntheticEmail: string, password: string): Promise<AuthUser>;
  setPassword(authUserId: string, newPassword: string): Promise<void>;
}
```

**Request-time identity resolution:** a `SupabaseAuthGuard implements
CanActivate` verifies the bearer token on every request (via Supabase's
`getUser(token)`), resolves it to an `identities` row (by `auth_user_id`),
then to the relevant `school_memberships` + teacher/admin profile, and
attaches that context to the request for downstream guards
(`SectionSubjectWriteGuard`, `RequireRole('admin')`, etc.) to use. RLS
(`current_identity_id()` / `current_teacher_id()`) is defense-in-depth
underneath this, not a replacement for it — the NestJS guard is what a
controller method actually runs first.

---

## Part 2 — Frontend (Svelte 5 SPA + Tailwind)

Plain Svelte 5 SPA, built with Vite — not SvelteKit. No SSR, no
file-based routing, no `load` functions. Everything renders client-side
against the NestJS API.

**Router: `@keenmate/svelte-spa-router`.** Rune-based (Svelte 5 native),
supports hash or history-mode routing, and has a built-in permissions
system (`configurePermissions`, `setCurrentUser`, `onUnauthorized`) that
maps directly onto the role-gate pattern below. (`svelte5-router` —
nested routers, navigation hooks — is a reasonable alternative if more
routing flexibility is ever needed; don't run both.)

### One app, role-based sections

A single Svelte SPA codebase serves admin, teacher, and parent — not
separate apps. This mirrors the backend's "one backend, thin channel
skins" principle: one app, role-scoped routes, no duplicated logic across
three deployables.

### Pattern: feature folders mirror backend bounded contexts

Frontend structure follows the same vertical-slice philosophy as the
backend, not a type-based split (`components/`, `stores/`, `utils/` as flat
top-level folders holding everything). Each feature owns its own API
client, components, and local state, and maps 1:1 to a backend module.

```
apps/web/
  src/
    routes/                         # plain components, NOT SvelteKit file-routing
      admin/
        Dashboard.svelte
        Pacing.svelte
      teacher/
        Sweep.svelte
        Lesson.svelte
        Coach.svelte
      parent/
        Portal.svelte
      auth/
        Login.svelte
    router/
      routes.ts                     # central route table: path, component, requiredRole
      permissions.ts                # configurePermissions/checkPermissions/onUnauthorized
    lib/
      features/
        calendar/
          api.ts                    # the ONLY place fetches to /calendar/* happen
          components/
            CalendarSetupWizard.svelte
          stores/
            calendarStore.ts
          types.ts
        outcomes/
          api.ts
          components/
            MilestoneSweepGrid.svelte
          stores/
          types.ts
        remedial/
        pacing/
        messaging/
        coach/
        reports/
      shared/
        components/                 # design-system primitives only: Button, Card, Modal, Badge
        stores/
          session.ts                # auth/session state, role — feeds the permission system
        api/
          client.ts                 # base fetch wrapper: auth header injection, error normalization
        utils/
      styles/
        app.css
    App.svelte                      # hosts <Router>, root shell, nav varies by role
    main.ts
  index.html
  vite.config.ts
  tailwind.config.ts
  public/
```

### Rules to apply, not improvise variations of

**1. A feature's `api.ts` is the only place that calls its corresponding
backend module's endpoints.** If `outcomes` needs calendar data, it imports
a function from `features/calendar/api.ts` — it does not issue its own raw
fetch to `/calendar/...`. This is the frontend equivalent of the backend's
"inject a service, never a repository" rule: one owner per external call
surface.

**2. Route access is gated through the router's permission system, driven
by `session.ts`, not scattered `if (role === ...)` checks in components.**
Define required-role metadata per route in `router/routes.ts`, wire
`configurePermissions`/`checkPermissions`/`onUnauthorized` once in
`router/permissions.ts`, and let the router redirect on mismatch. Don't
hand-roll a role check inside individual page components — one place
decides who can reach a route.

**3. This is client-side enforcement only — say so, don't imply otherwise.**
There is no SSR, no server render step, nothing gating a route except
JavaScript that already shipped to the browser. The router's permission
check is UX (send the right person to the right screen, fail predictably),
**not** a security boundary. Every actual enforcement (two-grain scope,
gravity rule, mapper guards) is backend-authoritative — the API must
reject an unauthorized request even if a user's browser somehow rendered
the "wrong" route. This was already true under SvelteKit; without SSR,
it's the *only* true statement, so don't write code (or comments) that
implies the frontend gate is doing security work.

**4. `shared/` is for genuine design-system primitives only.** A
domain-specific component (`MilestoneSweepGrid`, `PacingBadge`) lives in
its owning feature's `components/` folder even if it looks visually
generic — it doesn't move to `shared/` just because it's reusable-looking.

**5. State management stays light, and all data fetching is client-side.**
No `load` functions — a feature's `api.ts` is called from `onMount` or a
reactive `$effect`, with results held in that feature's store. Lightweight
per-feature Svelte stores (runes-based, `$state`) handle both fetched data
and client-only UI state (e.g. "which row is expanded"). No global state
library, no data-fetching library required at this scale — if repeated
fetch/cache/invalidate boilerplate becomes a real problem later, evaluate
a lightweight query library then, don't pre-adopt one now.

**6. The parent portal (`routes/parent/`) is view-only plus explicit
confirm actions** (replying to a message, toggling photo consent) — no
authoring/editing flows beyond what the spec explicitly grants parents.

**7. Type/contract drift:** import from `lib/shared/api/generated-types.ts`
— generated from the backend's OpenAPI spec via `openapi-typescript` (see
Part 1's API-documentation section) — rather than hand-declaring a backend
response shape in a feature's `types.ts`. A feature's `types.ts` should
only contain types genuinely local to that feature (view-model shapes,
form state), not redeclarations of what the backend already returns.

---

## Part 3 — Testing & definition of done

A feature, bug fix, or behavior-changing refactor is **not done** until
proportionate tests exist for every layer touched and those tests have been
**executed**. This has the same standing as Swagger decoration (Part 1) and
mapper-guard / RLS coverage — not optional polish, not a follow-up ticket
unless explicitly waived.

**Stack:** Vitest in `apps/api`, `apps/web`, and packages. Backend specs are
colocated as `*.spec.ts` next to the unit under test (see existing
`calendar.service.spec.ts`, RBAC guard specs). Frontend tests cover pure
feature logic and interactive component behavior; mock a feature's `api.ts`,
never call the real Nest API from unit/component tests.

**Minimum bar by surface:**

| Surface | Minimum |
|---|---|
| Backend service / guard / interceptor | Colocated unit spec: happy path + important failures |
| Domain-critical paths (mapper guards, propose/confirm, gravity, RLS, no-rank-order) | Automated tests that fail if the guard is weakened |
| Frontend pure logic / stores | Unit tests for the changed behavior |
| Frontend interactive UI with branching | Component tests for user-visible outcomes |

Run the filters for what you touched, e.g.
`pnpm --filter @eduai/api test` and/or `pnpm --filter @eduai/web test`.
Do not claim tests passed unless they were actually run. Full conventions
and patterns: `.cursor/rules/testing.mdc` and
`skills/testing-patterns/SKILL.md`.
