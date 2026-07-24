# Phase 3: Deployment & Polish (Weeks 6-8)

**Goal:** Prepare for production deployment and resolve content blockers
**Priority:** MEDIUM-HIGH
**Estimated Effort:** 45 hours
**Status:** Not Started

## Overview

Phase 3 prepares the system for production deployment with containerization, deployment configs, safeguarding implementation, and security validation.

## Objectives

1. **Containerization** - Dockerfiles for all 4 apps (API, DocGen, Jobs, Web)
2. **Deployment Configs** - Fly.io configs + deployment documentation
3. **Safeguarding (CRITICAL)** - Fast-path implementation + testing
4. **Security Validation** - RLS audit, cross-domain checks, audit logs
5. **Performance** - Load testing + caching effectiveness

## Success Criteria

### Week 6
- [x] Dockerfiles for all 4 apps
- [x] Fly.io configs for all apps
- [x] Environment variable templates updated
- [x] Deployment documentation complete

### Week 7
- [x] Content dependencies documented
- [x] **Safeguarding fast-path implemented and tested (CRITICAL)**
- [x] BS↔AD date conversion verified
- [x] Devanagari rendering verified

### Week 8
- [x] RLS comprehensive audit passed
- [x] Cross-domain contamination tests passing
- [x] Audit logs complete
- [x] Performance benchmarks passing
- [x] Staging smoke tests passing

## Deliverables

- **Deployment:** 4 Dockerfiles + 4 Fly.io configs + deployment docs
- **Safeguarding:** Detection service + fast-path routing + tests (CRITICAL)
- **Security:** RLS audit + cross-domain tests + audit logs
- **Performance:** Load tests + caching benchmarks
- **Content:** Dependencies documented (for external teams)

## Dependencies

**Requires:**
- Phase 1 + 2 complete: Foundation + core features functional

**Enables:**
- Production deployment
- External stakeholder handoff (content teams)

## Critical Item: Safeguarding Fast-Path

**Priority:** CRITICAL - Must be completed before production
**Task:** 7.2 - Implement Safeguarding Fast-Path
**Effort:** 6 hours

This is **non-negotiable** for production release. All harm signals must:
- Bypass normal assessment flow
- Immediately notify class teacher + principal
- Create audit trail
- Require human review

## Weekly Breakdown

### [Week 6: Deployment Configurations](./week-6-deployment-configs.md)
**Focus:** Containerization + Infrastructure
**Effort:** 13 hours
- 6.1: Create Dockerfiles for All Apps (4h)
- 6.2: Create Fly.io Deployment Configs (3h)
- 6.3: Create Environment Variable Templates (2h)
- 6.4: Document Deployment Process (4h)

### [Week 7: Content Blockers + Safeguarding](./week-7-content-safeguarding.md)
**Focus:** Content + Safety (CRITICAL)
**Effort:** 14 hours
- 7.1: Document Content Dependencies (3h)
- 7.2: **Implement Safeguarding Fast-Path (CRITICAL)** (6h)
- 7.3: BS ↔ AD Date Conversion Verification (2h)
- 7.4: Devanagari Rendering Verification (3h)

### [Week 8: Security Audit + Performance Testing](./week-8-security-performance.md)
**Focus:** Production Readiness
**Effort:** 18 hours
- 8.1: RLS Policy Comprehensive Audit (4h)
- 8.2: Cross-Domain Contamination Verification (3h)
- 8.3: Audit Log Completeness (3h)
- 8.4: Performance Testing (4h)
- 8.5: Smoke Tests on Staging (4h)

## Progress Tracking

See [status.json](./status.json) for detailed task tracking.

---

**Previous:** [Phase 2: Core Features](../phase-2-core-features/README.md)  
**Next:** [Week 6 Tasks](./week-6-deployment-configs.md)
