---
name: testing-patterns
description: >-
  Vitest testing patterns for EduAI Nepal — NestJS backend specs, Svelte 5
  frontend unit/component tests, factories, mocking, and definition-of-done
  workflow. Use when writing or reviewing tests for apps/api, apps/web, or
  packages; when finishing a feature; or when following TDD.
---

# Testing Patterns (EduAI Nepal)

## Stack (do not substitute)

| App / package | Runner | Spec location |
|---|---|---|
| `apps/api` | Vitest (`environment: 'node'`) | Colocated `*.spec.ts` under `src/` |
| `apps/web` | Vitest | Next to feature code (`*.spec.ts` / `*.test.ts`) |
| packages | Vitest | Colocated |

- Import from `vitest`: `describe`, `it`, `expect`, `vi`, `beforeEach`
- **Not Jest.** **Not React Native Testing Library.**
- Hard DoD: `.cursor/rules/testing.mdc` and `ARCHITECTURE.md` Part 3

## Philosophy

- Test **behavior**, not implementation details
- Prefer factories: `getMockX(overrides?: Partial<X>)`
- Arrange–Act–Assert; clear names: `rejects when draft already exists`
- One behavior per `it`
- Clear mocks in `beforeEach` (`vi.clearAllMocks()`)
- Never claim pass unless the filter was run this session

## Backend (NestJS + Vitest)

Mirror existing specs such as
`apps/api/src/modules/calendar/calendar.service.spec.ts`.

### Service unit test

```typescript
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarService } from './calendar.service';
import type { CalendarRepository } from './calendar.repository';

function getMockSetupDto(overrides?: Partial<CalendarSetupDto>): CalendarSetupDto {
  return {
    academicYearLabel: '2082',
    sessionStart: '2025-04-14',
    sessionEnd: '2026-04-13',
    weeklyOffs: [6],
    terminals: [/* ... */],
    ...overrides,
  };
}

describe('CalendarService', () => {
  let service: CalendarService;
  let repository: {
    findDraftCalendar: ReturnType<typeof vi.fn>;
    insertCalendar: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findDraftCalendar: vi.fn(),
      insertCalendar: vi.fn(),
    };
    service = new CalendarService(repository as unknown as CalendarRepository);
  });

  it('rejects when a draft calendar already exists', async () => {
    repository.findDraftCalendar.mockResolvedValue({ id: 'cal-existing' });
    await expect(
      service.setupCalendar('school-1', getMockSetupDto()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.insertCalendar).not.toHaveBeenCalled();
  });
});
```

### Guard / interceptor

- Construct the guard with mocked deps
- Cover **allow** and **deny** paths
- For admin gravity / section-subject write: assert the invariant, not just
  that a method was called

### Domain-critical paths (never optional)

When touching these, add tests that fail if the guard is weakened:

1. Mapper: no top-band jump from one sighting; ambiguous name → roll-number
   candidates; non-observation → attendance; only confirm writes
2. Propose never writes; confirm never calls AI
3. Admin aggregates: counts/shapes only — no band distributions, no names
4. Two-grain write scope `(section_id, subject_id)`

## Frontend (Svelte 5 + Vitest)

- Unit-test pure helpers and rune-based store logic without mounting UI
- Component-test interactive branching (submit, error, empty, success)
- **Mock the feature's `api.ts`** — never hit the real Nest API in unit/
  component tests
- Import types from `generated-types.ts`; don't redeclare API shapes in tests

### Pure logic

```typescript
import { describe, expect, it } from 'vitest';
import { formatTeachingDayCount } from './format-teaching-day-count';

describe('formatTeachingDayCount', () => {
  it('returns zero label when count is 0', () => {
    expect(formatTeachingDayCount(0)).toBe('0 teaching days');
  });
});
```

### Mocking a feature API module

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as calendarApi from './api';

vi.mock('./api', () => ({
  fetchTerminals: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it('surfaces empty state when no terminals', async () => {
  vi.mocked(calendarApi.fetchTerminals).mockResolvedValue([]);
  // mount / exercise store or component, assert user-visible outcome
});
```

Use `@testing-library/svelte` (or the project's adopted Svelte testing
helpers) once added to `apps/web` — prefer user-visible assertions
(`getByRole`, text) over internal store peeking when testing components.

## Factories

```typescript
const getMockUser = (overrides?: Partial<User>): User => ({
  id: '123',
  name: 'Jane Teacher',
  role: 'teacher',
  ...overrides,
});
```

Keep defaults valid for the domain; override only what the test cares about.

## Anti-patterns

```typescript
// Bad — testing the mock
expect(mockFetchData).toHaveBeenCalled();

// Good — testing observable result
expect(actual.approvalStatus).toBe('draft');
```

- Duplicated inline fixtures instead of factories
- Jest / React Native examples from community skills
- Skipping specs because scripts use `--passWithNoTests`
- E2E for every tiny change (prefer fast unit/component tests)

## Running tests

```bash
# Touched API
pnpm --filter @eduai/api test

# Touched web
pnpm --filter @eduai/web test

# Whole monorepo
pnpm test

# Single file (from package dir)
pnpm exec vitest run src/modules/calendar/calendar.service.spec.ts
```

## Workflow (feature / bugfix)

1. Write or update the failing/behavior-spec first when practical
2. Implement minimal code to pass
3. Run the filter(s) for touched apps
4. Only then mark the task complete / ready for commit

## Related

- `.cursor/rules/testing.mdc` — hard DoD
- `ARCHITECTURE.md` Part 3 — architecture-level testing bar
- `.cursor/commands/test.md` / `complete.md` — review gates
- `.cursor/rules/invariants.mdc` — domain tests that are never optional
