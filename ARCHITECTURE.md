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

---

## Part 2 — Frontend (SvelteKit + Tailwind)

### One app, role-based sections

A single SvelteKit codebase serves admin, teacher, and parent — not
separate apps. This mirrors the backend's "one backend, thin channel
skins" principle: one app, role-scoped route groups, no duplicated logic
across three deployables.

### Pattern: feature folders mirror backend bounded contexts

Frontend structure follows the same vertical-slice philosophy as the
backend, not a type-based split (`components/`, `stores/`, `utils/` as flat
top-level folders holding everything). Each feature owns its own API
client, components, and local state, and maps 1:1 to a backend module.

```
apps/web/
  src/
    routes/
      (admin)/
        dashboard/+page.svelte
        pacing/+page.svelte
        +layout.ts               # role guard: admin only, redirects otherwise
      (teacher)/
        sweep/+page.svelte
        lesson/+page.svelte
        coach/+page.svelte
        +layout.ts               # role guard: teacher only
      (parent)/
        portal/+page.svelte
        +layout.ts               # role guard: parent only
      (auth)/
        login/+page.svelte
      +layout.svelte              # root shell; nav varies by role
    lib/
      features/
        calendar/
          api.ts                 # the ONLY place raw fetches to /calendar/* happen
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
        components/               # design-system primitives only: Button, Card, Modal, Badge
        stores/
          session.ts              # auth/session state, role
        api/
          client.ts               # base fetch wrapper: auth header injection, error normalization
        utils/
      styles/
        app.css
    app.html
  tailwind.config.ts
  svelte.config.js
  static/
```

### Rules to apply, not improvise variations of

**1. A feature's `api.ts` is the only place that calls its corresponding
backend module's endpoints.** If `outcomes` needs calendar data, it imports
a function from `features/calendar/api.ts` — it does not issue its own raw
fetch to `/calendar/...`. This is the frontend equivalent of the backend's
"inject a service, never a repository" rule: one owner per external call
surface.

**2. Route groups are the role boundary, enforced in `+layout.ts` /
`load`, not just hidden nav items.** Each role's route group checks the
authenticated role server-side and redirects/errors on mismatch — same
discipline as the backend's `SubstituteRoleGuard`. Never rely on "the nav
link isn't shown" as the actual boundary.

**3. `shared/` is for genuine design-system primitives only.** A
domain-specific component (`MilestoneSweepGrid`, `PacingBadge`) lives in
its owning feature's `components/` folder even if it looks visually
generic — it doesn't move to `shared/` just because it's reusable-looking.

**4. State management stays light.** SvelteKit `load` functions handle
server-fetched data (SSR benefit, avoids duplicate client-side fetches);
lightweight per-feature Svelte stores handle client-only UI state (e.g.
"which row is expanded"). No global state library. Cross-feature global
state would recreate the same boundary violations rule 1 exists to
prevent.

**5. The frontend is never the authority for access control.** It may
reflect role/scope for UX — disabling a button a teacher shouldn't see —
but every actual enforcement (two-grain scope, gravity rule, mapper
guards) is backend-authoritative. A hidden button is not a security
boundary.

**6. The parent portal (`(parent)/`) is view-only plus explicit confirm
actions** (replying to a message, toggling photo consent) — no
authoring/editing flows beyond what the spec explicitly grants parents.

**7. Type/contract drift:** DTOs returned by NestJS controllers should have
a single shared source of truth that frontend `types.ts` files import from
— don't hand-duplicate response shapes per feature. If this isn't set up
yet, it's a near-term task (see `PHASE_TASKS.md` Phase 0/1), not something
to defer indefinitely — drift here silently breaks the UI in ways tests
won't catch until a backend DTO changes shape.
