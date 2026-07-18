# Code Review

Perform a senior engineer review.

Review for:

## Architecture

- SOLID
- DRY
- Separation of concerns

## Readability

- Naming
- Function size
- Complexity

## Bugs

- Logic errors
- Null handling
- Race conditions
- Edge cases

## Security

- Authentication
- Authorization
- Validation
- Injection
- Secrets

## Performance

- Duplicate queries
- N+1 problems
- Memory issues

## Maintainability

- Duplication
- Dead code
- Technical debt

## Testing (DoD — `.cursor/rules/testing.mdc`)

- Proportionate Vitest coverage for every touched behavioral layer?
- Backend `*.spec.ts` colocated for changed services/guards?
- Frontend unit/component tests when `apps/web` behavior changed?
- Domain-invariant tests when applicable (mapper guards, propose/confirm,
  gravity, RLS, no-rank-order)?
- Tests actually run for touched apps, or only claimed?

Missing or unrun tests for a behavior change are a **Critical Issue**,
not a suggestion — unless the change is docs-only or the user waived tests.

## Output

Provide:

Critical Issues

Warnings

Suggestions

Positive Findings

Testing DoD (Met / Unmet + gaps)

Overall Rating (1-10)