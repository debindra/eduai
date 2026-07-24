# Week 8: Security Audit + Performance Testing

**Phase:** 3 - Deployment & Polish
**Priority:** HIGH
**Estimated Effort:** 18 hours
**Status:** Not Started

## Overview

Week 8 validates production readiness through security audits and performance testing.

## Tasks

### 8.1 RLS Policy Comprehensive Audit
**Priority:** HIGH | **Effort:** 4 hours | **Status:** ⬜ Not Started

**Verification Checklist:**
- [ ] All 16 sensitive tables have RLS policies
- [ ] Teacher cannot read cross-section outcomes
- [ ] Subject teacher cannot write to other subject
- [ ] Admin cannot read individual child data (gravity rule)

**Detailed Instructions:** See main plan Section "Phase 3, Task 8.1"

---

### 8.2 No Cross-Domain Contamination Verification
**Priority:** HIGH | **Effort:** 3 hours | **Status:** ⬜ Not Started

**File to Modify:**
- `apps/api/src/modules/outcomes/outcomes.spec.ts`

**Test Cases:**
- Math teacher cannot write English outcome
- Language delay does not affect math rating
- Subject outcomes are independent
- Observable text stays within domain

**Detailed Instructions:** See main plan Section "Phase 3, Task 8.2"

---

### 8.3 Audit Log Completeness
**Priority:** MEDIUM | **Effort:** 3 hours | **Status:** ⬜ Not Started

**File to Modify:**
- `apps/api/src/modules/platform/audit.service.ts`

**Ensure Logging for:**
- Platform support sessions
- Admin aggregate views
- Outcome confirmations
- Remedial escalations
- Handover pack delivery
- Photo consent changes

**Detailed Instructions:** See main plan Section "Phase 3, Task 8.3"

---

### 8.4 Performance Testing
**Priority:** MEDIUM | **Effort:** 4 hours | **Status:** ⬜ Not Started

**Test Scenarios:**
1. API endpoint load testing
2. Calendar reflow at scale (100+ sections)
3. AI caching effectiveness (>70% hit rate)

**Detailed Instructions:** See main plan Section "Phase 3, Task 8.4"

---

### 8.5 Smoke Tests on Staging
**Priority:** HIGH | **Effort:** 4 hours | **Status:** ⬜ Not Started

**Critical Paths to Test:**
- [ ] Teacher login → sweep → propose → confirm
- [ ] Admin login → view aggregates
- [ ] Calendar edit → verify reflow
- [ ] Generate report → verify deterministic rendering
- [ ] Safeguarding signal → verify notifications

**Detailed Instructions:** See main plan Section "Phase 3, Task 8.5"

---

**End of Implementation Plan**
