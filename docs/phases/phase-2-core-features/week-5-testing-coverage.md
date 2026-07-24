# Week 5: Testing Coverage + Comprehensive Tests

**Phase:** 2 - Core Features
**Priority:** HIGH
**Estimated Effort:** 16 hours
**Status:** Not Started

## Overview

Week 5 enforces code quality with coverage thresholds and comprehensive testing.

## Tasks

### 5.1 Add Coverage Thresholds to Vitest Config
**Priority:** HIGH | **Effort:** 2 hours | **Status:** ⬜ Not Started

**Files to Modify:**
- `apps/api/vitest.config.ts`
- `apps/web/vitest.config.ts`
- `.github/workflows/ci.yml`

**Target:** 80% coverage in critical modules

**Detailed Instructions:** See main plan Section "Phase 2, Task 5.1"

---

### 5.2 RLS Policy Effectiveness Tests
**Priority:** HIGH | **Effort:** 6 hours | **Status:** ⬜ Not Started

**File to Create:**
- `packages/db/supabase/tests/rls_enforcement.sql` (NEW)

**Test Cases:**
- Teacher cannot read cross-section outcomes
- Subject teacher cannot write to other subject
- Admin cannot read individual child data

**Detailed Instructions:** See main plan Section "Phase 2, Task 5.2"

---

### 5.3 Mapper Guards Comprehensive Test Audit
**Priority:** HIGH | **Effort:** 6 hours | **Status:** ⬜ Not Started

**File to Modify:**
- `apps/api/src/modules/outcomes/mapper-guards.spec.ts`

**Coverage:** 4 guards × 4 capture paths = 16 test cases

**Detailed Instructions:** See main plan Section "Phase 2, Task 5.3"

---

### 5.4 Teaching Days Schema Audit
**Priority:** HIGH | **Effort:** 2 hours | **Status:** ⬜ Not Started

**File to Create:**
- `scripts/ci/check-teaching-days-schema.mjs` (NEW)

**Purpose:** Ensure no cached teaching_days columns exist (Invariant #6)

**Detailed Instructions:** See main plan Section "Phase 2, Task 5.4"

---

**Next:** [Phase 3: Deployment](../phase-3-deployment/README.md)
