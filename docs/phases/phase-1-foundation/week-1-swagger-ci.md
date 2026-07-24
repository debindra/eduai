# Week 1: Swagger/OpenAPI + CI Enhancements

**Phase:** 1 - Foundation
**Priority:** HIGH
**Estimated Effort:** 13 hours
**Status:** Not Started

## Overview

Week 1 focuses on completing API documentation and enhancing CI infrastructure to enforce architectural invariants.

## Tasks

### 1.1 Complete Swagger/OpenAPI Decoration
**Priority:** HIGH | **Effort:** 6 hours | **Status:** ⬜ Not Started

**Goal:** Add comprehensive `@ApiResponse` decorators to all 28 controllers

**Files to Modify:**
- `apps/api/src/modules/outcomes/outcomes.controller.ts`
- `apps/api/src/modules/remedial/remedial.controller.ts`
- `apps/api/src/modules/ai-orchestration/*.controller.ts`
- `apps/api/src/modules/messaging/messaging.controller.ts`
- `apps/api/src/modules/pacing/pacing.controller.ts`
- `apps/api/src/modules/handover/handover.controller.ts`
- `apps/api/src/modules/reports/reports.controller.ts`
- (17 more controllers - see plan)

**Decorators to Add:**
```typescript
@ApiOkResponse({ description: 'Success', type: ResponseDto })
@ApiBadRequestResponse({ description: 'Validation failed' })
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@ApiNotFoundResponse({ description: 'Resource not found' })
```

**Verification:**
```bash
pnpm --filter @eduai/api build
curl http://localhost:3000/api/docs-json > openapi.json
# Inspect for complete response schemas
```

**Detailed Instructions:** See main plan Section "Phase 1, Task 1.1"

---

### 1.2 Enhance Rank-Order Query Check
**Priority:** HIGH | **Effort:** 3 hours | **Status:** ⬜ Not Started

**Goal:** Detect window functions in rank-order check

**File to Modify:**
- `scripts/ci/check-rank-order.mjs`

**Enhancements:**
- Add detection for `RANK()`, `DENSE_RANK()`, `ROW_NUMBER()`
- Add detection for `percentile_cont()`, `percentile_disc()`
- Enhance pattern matching with window function syntax

**Testing:**
```bash
pnpm test:rank-order-check
pnpm check:rank-order
```

**Detailed Instructions:** See main plan Section "Phase 1, Task 1.2"

---

### 1.3 Expand RLS Coverage Check
**Priority:** HIGH | **Effort:** 2 hours | **Status:** ⬜ Not Started

**Goal:** Expand RLS coverage check from 3 to 16 tables

**File to Modify:**
- `scripts/ci/check-rls-coverage.mjs`

**Tables to Add:**
- `guardians`, `sections`, `lesson_progress`
- `yearly_map`, `map_slices`, `map_slice_outcomes`
- `prompts`, `parent_report_drafts`, `coach_messages`
- `assessment_proposals`, `handover_pack`, `remedial_plans`
- `children` (read-only)

**Testing:**
```bash
pnpm check:rls-coverage
```

**Detailed Instructions:** See main plan Section "Phase 1, Task 1.3"

---

### 1.4 Create API Types Verification CI Check
**Priority:** HIGH | **Effort:** 2 hours | **Status:** ⬜ Not Started

**Goal:** Prevent frontend/backend type drift

**Files to Create:**
- `scripts/ci/verify-api-types.mjs` (NEW)

**Files to Modify:**
- `.github/workflows/ci.yml`
- `package.json`

**Implementation:**
```bash
# Add script
pnpm verify:api-types
# Should fail if generated types differ from committed types
```

**Detailed Instructions:** See main plan Section "Phase 1, Task 1.4"

---

## Success Criteria

- [x] All 28 controllers have comprehensive `@ApiResponse` decorators
- [x] Rank-order check detects window functions
- [x] RLS coverage check includes 16 tables
- [x] API types CI check prevents drift

## Dependencies

**Requires:** None - can start immediately

**Enables:**
- Week 2: Observability setup
- Week 5: API type generation for E2E tests

## Progress Tracking

Update `status.json` after completing each task.

---

**Next:** [Week 2: Observability + Port Definitions](./week-2-adapters-observability.md)
