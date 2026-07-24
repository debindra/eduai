# Phase 2: Core Features (Weeks 3-5)

**Goal:** Implement critical feature workflows and integrations
**Priority:** HIGH
**Estimated Effort:** 46 hours
**Status:** Not Started

## Overview

Phase 2 builds on the foundation from Phase 1 to implement core system workflows, end-to-end testing, and comprehensive test coverage.

## Objectives

1. **Job Orchestration** - Set up durable workflow platform (Inngest/Trigger.dev)
2. **E2E Testing** - 3 critical flows validated end-to-end
3. **Test Coverage** - 80%+ coverage in critical modules
4. **RLS Validation** - Policy effectiveness tests passing

## Success Criteria

### Week 3
- [x] Job orchestration platform chosen
- [x] 3 workflow stubs implemented (terminal report, remedial, handover)

### Week 4
- [x] WhatsApp stub adapter created
- [x] 3 E2E flows passing (teacher sweep, admin aggregate, calendar reflow)

### Week 5
- [x] Coverage thresholds enforced (80%+)
- [x] RLS enforcement tests passing
- [x] Mapper guards audit complete (16 test cases)
- [x] Teaching days schema verified (no cached columns)

## Deliverables

- **Job Workflows:** 3 stub implementations (terminal report, remedial, handover)
- **E2E Tests:** 3 critical flows with Playwright
- **Test Coverage:** 80%+ in outcomes, remedial, calendar, pacing modules
- **RLS Tests:** SQL enforcement tests for all 16 sensitive tables
- **CI Checks:** Coverage thresholds + teaching days schema audit

## Dependencies

**Requires:**
- Phase 1 complete: API docs, CI checks, observability

**Enables:**
- Phase 3: Deployment validation (E2E tests on staging)
- Phase 3: Production readiness (coverage requirements met)

## Weekly Breakdown

### [Week 3: Job Orchestration](./week-3-job-orchestration.md)
**Focus:** Durable Workflows
**Effort:** 16 hours
- 3.1: Choose Job Orchestration Platform (2h)
- 3.2: Terminal-End Report Generation Workflow (5h)
- 3.3: Remedial Escalation Workflow (4h)
- 3.4: Handover Pack Assembly Workflow (5h)

### [Week 4: WhatsApp Integration + E2E Tests](./week-4-whatsapp-e2e.md)
**Focus:** End-to-End Validation
**Effort:** 14 hours
- 4.1: WhatsApp Cloud API Integration (Stub) (3h)
- 4.2: E2E Test: Teacher Sweep → Propose → Confirm (4h)
- 4.3: E2E Test: Admin Aggregate (No Child Names) (3h)
- 4.4: E2E Test: Calendar Edit → Teaching Days Reflow (4h)

### [Week 5: Testing Coverage + Comprehensive Tests](./week-5-testing-coverage.md)
**Focus:** Quality Assurance
**Effort:** 16 hours
- 5.1: Coverage Thresholds in Vitest Config (2h)
- 5.2: RLS Policy Effectiveness Tests (6h)
- 5.3: Mapper Guards Comprehensive Audit (6h)
- 5.4: Teaching Days Schema Audit (2h)

## Progress Tracking

See [status.json](./status.json) for detailed task tracking.

---

**Previous:** [Phase 1: Foundation](../phase-1-foundation/README.md)  
**Next:** [Week 3 Tasks](./week-3-job-orchestration.md)
