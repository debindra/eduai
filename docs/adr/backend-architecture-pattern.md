# ADR 0003 — Backend architecture pattern: modular layered monolith, bounded-context modules

**Status:** Accepted
**Date:** (set when merged)
**Depends on:** ADR 0002 (NestJS)

## Context

The domain is genuinely complex (band-as-data, calendar/curriculum
separation, a remedial-ladder lifecycle, two-grain RBAC, deterministic vs.
AI-generated content) but the team is currently solo/1–2 engineers, and the
domain model is already specified in detail by the source docs — the task
is disciplined implementation, not domain discovery.

## Decision

**Modular layered monolith.** Each NestJS module is a bounded context.
Inside a module: `Controller` (thin — parse, call service, return) →
`Service` (domain/business logic) → `Repository` (data-access interface +
Supabase-backed implementation). This is a plain three-layer architecture,
not full DDD — no value-object wrapping of primitives, no aggregate
purism, no domain-event bus.

**Explicitly rejected for now:**
- Full DDD tactical patterns — too much ceremony for team size; the docs
  already are the domain model.
- CQRS / event sourcing — no need for event replay or a separate read
  store; deterministic aggregation already computes live from rows.
- Microservices — premature given team size, except `DocGenModule`, which
  has a standing technical reason (rendering-environment isolation:
  fonts-noto-core, the docx landscape-orientation quirk) to be a separately
  deployed service regardless of scale.

**Three patterns adopted where the domain specifically calls for them:**

### 1. Propose/Confirm command split (structural enforcement of "the level is human")

Any write path that starts from an AI proposal (outcome mapping, remedial
activity suggestion) is split into two distinct service methods, not one
method with an internal branch:

```ts
// OutcomesService
async proposeOutcome(observation: ObservationInput): Promise<OutcomeProposal> {
  // calls AiOrchestrationModule, returns a candidate — NEVER writes
}

async confirmOutcome(proposalId: string, teacherId: string, edits?: Partial<OutcomeProposal>): Promise<StudentOutcome> {
  // guarded by SectionSubjectWriteGuard; this is the only method that writes
}
```
No single method should both call the AI orchestration layer and write to
`student_outcomes`. If you find yourself doing that, split it.

### 2. Explicit state machines for lifecycle objects

`remedial_plans`, `handover_pack` assembly, and certification progress are
modeled as an explicit state-transition service, not an implicit status
field mutated from scattered call sites:

```ts
// RemedialStateMachineService
transition(plan: RemedialPlan, event: RemedialEvent): RemedialPlan {
  // Opened -> ActivityDelivered -> ReAssessed -> (Escalated | Closed)
  // invalid transitions throw — never silently no-op
}
```
All status changes for these objects go through this service. No
`remedial_plans.status = 'closed'` written directly from a controller or an
unrelated service.

### 3. Config-driven strategy selection (band-as-data at the code layer)

Anything that varies by band or document type is a lookup against a config
row, resolved through a small registry/strategy interface — never an
`if (grade === X)` branch:

```ts
interface DocumentRenderer {
  render(sourceRows: unknown): Promise<Buffer>;
}
// DeterministicRenderer, AiAssistedThenApprovedRenderer — selected via a
// documentType -> renderer lookup table, not a switch statement.
```
This is the same discipline `.cursor/rules/00-invariants.mdc` already
requires for `bands`/`assessment_mode` — this ADR extends it explicitly to
document rendering and prompt-template selection.

### 4. Ports & Adapters, narrowly, for external systems only

WhatsApp Cloud API, the Anthropic API, Upstash Redis, Cloudflare R2, and
Twilio/MSG91 are each accessed through an interface (`MessagingProviderPort`,
`AiProviderPort`, `CachePort`, `StoragePort`, `OtpFallbackPort`) with a
concrete adapter implementation injected via NestJS DI. This is scoped to
external integrations only — do not apply ports/adapters to internal
domain logic between your own modules.

## Module → cross-module communication rule

A module may only call another module's exported **service**, injected via
its module's public providers. **A module must never inject or query
another module's repository directly.** This is what keeps "gravity rule"
and "no business logic in a channel" real at the code level, and it's what
makes extracting a module into a separate deployable later (if the team
ever needs to) a boundary that already exists, not a discovery process.

## Folder structure convention

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
  docgen/                          # separately deployed Nest app — see context above
  jobs/
  auth/
  admin/
shared/
  ports/                           # interfaces for external systems, shared across modules
```

## Consequences

- New feature work has an obvious home: pick the bounded-context module, or
  add a new one if none fits — never bolt logic onto an unrelated module's
  controller.
- Code review has one clear cross-module rule to check for: no repository
  injection across module boundaries.
- If the team grows and a module needs to become a real microservice
  later, the module boundary already IS the service boundary — extraction
  is a deployment change, not a redesign.
