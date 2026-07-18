# Testing Review

Review testing coverage for the current change. Enforce
`.cursor/rules/testing.mdc` and `ARCHITECTURE.md` Part 3.

Do not claim tests passed unless actually executed in this session.

## Scope

Identify which apps/packages were touched:

- Backend: `apps/api`, `apps/docgen`, packages
- Frontend: `apps/web`
- Domain-critical: mapper guards, propose/confirm, gravity, RLS, outcomes

## Backend

For each changed service / guard / interceptor / helper:

- Spec exists and is colocated (`*.spec.ts`)?
- Happy path covered?
- Important failures / authz denials covered?
- Domain invariants covered when applicable?

Run when backend was touched:

```bash
pnpm --filter @eduai/api test
```

## Frontend

For each changed feature:

- Pure logic / store tests?
- Interactive component behavior tests (if UI branches)?
- `api.ts` mocked (no real Nest calls)?

Run when frontend was touched:

```bash
pnpm --filter @eduai/web test
```

## Edge Cases

Validation, null/empty, authorization, concurrency, failure paths —
flag gaps that matter for the changed behavior.

## Output

Testing Score (1–10)

Layers Touched (api / web / both / docs-only)

Missing Tests

Recommended Tests

Commands Run (exact) + Pass/Fail

Regression Risk

DoD Met? (Yes / No — cite missing items if No)
