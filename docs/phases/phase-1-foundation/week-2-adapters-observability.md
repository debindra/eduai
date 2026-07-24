# Week 2: Observability + Port Definitions

**Phase:** 1 - Foundation
**Priority:** HIGH
**Estimated Effort:** 13 hours
**Status:** Not Started

## Overview

Week 2 completes the Ports & Adapters pattern and sets up observability infrastructure for production readiness.

## Tasks

### 2.1 Create StoragePort Interface
**Priority:** HIGH | **Effort:** 3 hours | **Status:** ⬜ Not Started

**Files to Create:**
- `apps/api/src/shared/ports/storage.port.ts` (NEW)
- `apps/api/src/shared/adapters/console-storage.adapter.ts` (NEW)

**Detailed Instructions:** See main plan Section "Phase 1, Task 2.1"

---

### 2.2 Set Up Sentry Error Tracking
**Priority:** HIGH | **Effort:** 3 hours | **Status:** ⬜ Not Started

**Files to Modify:**
- `apps/api/src/main.ts`
- `apps/web/src/main.ts`
- `package.json`

**Dependencies to Add:**
- `@sentry/node`
- `@sentry/svelte`

**Detailed Instructions:** See main plan Section "Phase 1, Task 2.2"

---

### 2.3 Set Up Axiom Structured Logging
**Priority:** HIGH | **Effort:** 4 hours | **Status:** ⬜ Not Started

**Files to Create:**
- `apps/api/src/shared/services/logger.service.ts` (NEW)

**Files to Modify:**
- `package.json`

**Dependencies to Add:**
- `@axiomhq/js`

**Detailed Instructions:** See main plan Section "Phase 1, Task 2.3"

---

### 2.4 Document Adapter Implementation Guide
**Priority:** MEDIUM | **Effort:** 3 hours | **Status:** ⬜ Not Started

**Files to Create:**
- `docs/Architecture_Adapter_Implementation.md` (NEW)

**Contents:**
1. Adapter pattern overview
2. Port interface requirements
3. Environment variable conventions
4. Error handling patterns
5. Testing requirements
6. Example: WhatsAppCloudApiAdapter

**Detailed Instructions:** See main plan Section "Phase 1, Task 2.4"

---

## Success Criteria

- [x] StoragePort interface defined with stub adapter
- [x] Sentry integrated (API + Web)
- [x] Axiom logger service implemented
- [x] Adapter implementation guide documented

## Progress Tracking

Update `status.json` after completing each task.

---

**Previous:** [Week 1: Swagger/OpenAPI + CI](./week-1-swagger-ci.md)  
**Next:** [Phase 2: Core Features](../phase-2-core-features/README.md)
