# Week 6: Deployment Configurations

**Phase:** 3 - Deployment & Polish
**Priority:** MEDIUM
**Estimated Effort:** 13 hours
**Status:** Not Started

## Overview

Week 6 prepares all containerization and deployment configurations for production.

## Tasks

### 6.1 Create Dockerfiles for All Apps
**Priority:** MEDIUM | **Effort:** 4 hours | **Status:** ⬜ Not Started

**Files to Create:**
- `apps/api/Dockerfile` (NEW)
- `apps/docgen/Dockerfile` (NEW)
- `apps/jobs/Dockerfile` (NEW)
- `apps/web/Dockerfile` (NEW)
- `apps/web/nginx.conf` (NEW)

**Detailed Instructions:** See main plan Section "Phase 3, Task 6.1"

---

### 6.2 Create Fly.io Deployment Configs
**Priority:** MEDIUM | **Effort:** 3 hours | **Status:** ⬜ Not Started

**Files to Create:**
- `apps/api/fly.toml` (NEW)
- `apps/docgen/fly.toml` (NEW)
- `apps/jobs/fly.toml` (NEW)
- `apps/web/fly.toml` (NEW)

**Detailed Instructions:** See main plan Section "Phase 3, Task 6.2"

---

### 6.3 Create Environment Variable Templates
**Priority:** MEDIUM | **Effort:** 2 hours | **Status:** ⬜ Not Started

**File to Modify:**
- `.env.example`

**Detailed Instructions:** See main plan Section "Phase 3, Task 6.3"

---

### 6.4 Document Deployment Process
**Priority:** MEDIUM | **Effort:** 4 hours | **Status:** ⬜ Not Started

**File to Create:**
- `docs/Deployment.md` (NEW)

**Contents:**
1. Prerequisites (Fly.io account, CLI tools)
2. Environment setup per app
3. Database migration strategy
4. Deployment commands
5. Health check verification
6. Rollback procedure
7. Troubleshooting guide

**Detailed Instructions:** See main plan Section "Phase 3, Task 6.4"

---

**Next:** [Week 7: Content + Safeguarding](./week-7-content-safeguarding.md)
