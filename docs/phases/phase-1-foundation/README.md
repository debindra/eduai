# Phase 1: Foundation (Weeks 1-2)

**Goal:** Establish architectural foundations and critical infrastructure
**Priority:** HIGH
**Estimated Effort:** 26 hours
**Status:** Not Started

## Overview

Phase 1 focuses on completing foundational architecture work that enables all subsequent phases. This includes documentation, CI checks, and observability infrastructure.

## Objectives

1. **Complete API Documentation** - All 28 controllers fully documented with Swagger/OpenAPI
2. **Enhance CI Checks** - Rank-order, RLS coverage, API types verification
3. **Set Up Observability** - Sentry error tracking + Axiom structured logging
4. **Define Storage Port** - Complete ports & adapters pattern

## Success Criteria

### Week 1
- [x] All priority controllers have @ApiResponse decorators
- [x] Rank-order check detects window functions
- [x] RLS coverage check expanded from 3 to 16 tables
- [x] API types CI check prevents frontend/backend drift

### Week 2
- [x] StoragePort interface defined with stub adapter
- [x] Sentry integrated (API + Web)
- [x] Axiom logger service implemented
- [x] Adapter implementation guide documented

## Deliverables

- **Documentation:** 24 controllers with comprehensive @ApiResponse
- **CI Scripts:** 3 enhanced/new scripts (rank-order, RLS, API types)
- **Observability:** Sentry + Axiom integrated (stub mode OK)
- **Ports:** StoragePort interface + ConsoleStorageAdapter
- **Docs:** Architecture_Adapter_Implementation.md

## Dependencies

**Enables:**
- Phase 2: E2E tests need complete API docs for type generation
- Phase 2: Job orchestration needs observability for monitoring
- Phase 3: Deployment needs complete CI checks

**Requires:**
- None - can start immediately

## Weekly Breakdown

### [Week 1: Swagger/OpenAPI + CI Enhancements](./week-1-swagger-ci.md)
**Focus:** Documentation + CI Infrastructure
**Effort:** 13 hours
- 1.1: Complete Swagger/OpenAPI Decoration (6h)
- 1.2: Enhance Rank-Order Query Check (3h)
- 1.3: Expand RLS Coverage Check (2h)
- 1.4: Create API Types Verification CI Check (2h)

### [Week 2: Observability + Port Definitions](./week-2-adapters-observability.md)
**Focus:** Monitoring + Adapter Pattern Completion
**Effort:** 13 hours
- 2.1: Create StoragePort Interface (3h)
- 2.2: Set Up Sentry Error Tracking (3h)
- 2.3: Set Up Axiom Structured Logging (4h)
- 2.4: Document Adapter Implementation Guide (3h)

## Progress Tracking

See [status.json](./status.json) for detailed task tracking.

## Quick Start

```bash
# Navigate to this phase
cd docs/phases/phase-1-foundation

# Read Week 1 tasks
cat week-1-swagger-ci.md

# Start with task 1.1
# Open apps/api/src/modules/outcomes/outcomes.controller.ts
```

---

**Next:** [Week 1 Tasks](./week-1-swagger-ci.md)
