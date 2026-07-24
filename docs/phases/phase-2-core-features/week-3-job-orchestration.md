# Week 3: Job Orchestration

**Phase:** 2 - Core Features
**Priority:** HIGH
**Estimated Effort:** 16 hours
**Status:** Not Started

## Overview

Week 3 sets up the job orchestration platform for durable, multi-step workflows.

## Tasks

### 3.1 Choose Job Orchestration Platform
**Priority:** HIGH | **Effort:** 2 hours | **Status:** ⬜ Not Started

**Decision:** Inngest vs. Trigger.dev
**Recommendation:** Inngest (simpler, good durability)

**Detailed Instructions:** See main plan Section "Phase 2, Task 3.1"

---

### 3.2 Terminal-End Report Generation Workflow
**Priority:** HIGH | **Effort:** 5 hours | **Status:** ⬜ Not Started

**File to Create:**
- `apps/jobs/src/workflows/terminal-report-generation.ts` (NEW)

**Workflow Steps:**
1. Fetch outcomes for terminal
2. Generate report via AI (Sonnet)
3. Send for teacher approval
4. Deliver to parents via WhatsApp

**Detailed Instructions:** See main plan Section "Phase 2, Task 3.2"

---

### 3.3 Remedial Escalation Workflow
**Priority:** HIGH | **Effort:** 4 hours | **Status:** ⬜ Not Started

**File to Create:**
- `apps/jobs/src/workflows/remedial-escalation.ts` (NEW)

**Detailed Instructions:** See main plan Section "Phase 2, Task 3.3"

---

### 3.4 Handover Pack Assembly Workflow
**Priority:** HIGH | **Effort:** 5 hours | **Status:** ⬜ Not Started

**File to Create:**
- `apps/jobs/src/workflows/handover-pack-assembly.ts` (NEW)

**Detailed Instructions:** See main plan Section "Phase 2, Task 3.4"

---

**Next:** [Week 4: WhatsApp + E2E Tests](./week-4-whatsapp-e2e.md)
