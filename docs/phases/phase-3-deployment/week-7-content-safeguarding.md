# Week 7: Content Blockers + Safeguarding

**Phase:** 3 - Deployment & Polish
**Priority:** HIGH (Safeguarding is CRITICAL)
**Estimated Effort:** 14 hours
**Status:** Not Started

## Overview

Week 7 documents content dependencies and implements the CRITICAL safeguarding fast-path.

## Tasks

### 7.1 Document Content Dependencies
**Priority:** HIGH | **Effort:** 3 hours | **Status:** ⬜ Not Started

**File to Create:**
- `docs/Content_Dependencies.md` (NEW)

**Content Blockers to Document:**
1. 138-Milestone Pre-Primary Bank
2. Grades 4-5 Outcomes Bank
3. Teaching-Day Weights per Theme/Chapter
4. National Festival Template

**Detailed Instructions:** See main plan Section "Phase 3, Task 7.1"

---

### 7.2 Implement Safeguarding Fast-Path (CRITICAL)
**Priority:** CRITICAL | **Effort:** 6 hours | **Status:** ⬜ Not Started

⚠️ **CRITICAL - MUST BE COMPLETED BEFORE PRODUCTION**

**Files to Create:**
- `apps/api/src/modules/outcomes/safeguarding-detector.service.ts` (NEW)
- `apps/api/src/modules/outcomes/safeguarding-detector.spec.ts` (NEW)

**Requirements:**
- Detection of harm signals (abuse, injury, fear keywords)
- Immediate notification to class teacher + principal
- Bypass all normal assessment flows
- Audit trail for all signals
- Comprehensive testing

**Detailed Instructions:** See main plan Section "Phase 3, Task 7.2"

---

### 7.3 BS ↔ AD Date Conversion Verification
**Priority:** MEDIUM | **Effort:** 2 hours | **Status:** ⬜ Not Started

**File to Modify:**
- `packages/bs-date/test/convert.spec.ts`

**Verify:**
- AD → BS conversion accuracy
- BS → AD conversion accuracy
- Edge cases (leap years, month boundaries)
- Range: 2070 BS - 2090 BS

**Detailed Instructions:** See main plan Section "Phase 3, Task 7.3"

---

### 7.4 Devanagari Rendering Verification
**Priority:** MEDIUM | **Effort:** 3 hours | **Status:** ⬜ Not Started

**File to Create:**
- `apps/docgen/test/nepali-rendering.spec.ts` (NEW)

**Test:**
- Nepali text in PDF (no missing glyphs)
- Nepali text in DOCX
- Character encoding (UTF-8)

**Detailed Instructions:** See main plan Section "Phase 3, Task 7.4"

---

**Next:** [Week 8: Security + Performance](./week-8-security-performance.md)
