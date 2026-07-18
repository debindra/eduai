# Phase 1 — Band-as-data core + pre-primary happy path (tasks)

Source: [`PHASE_TASKS.md`](../../../PHASE_TASKS.md) Phase 1.
Status: [`../status/phase-1.md`](../status/phase-1.md).

**Exit criteria:** pilot class runs attendance → daily lesson → milestone
capture → monthly report for a full month; coverage and learning never merge
into one UI status.

---

## Database

### P1-DB-01 — School X yearly-map fixture
- **Area:** Database
- **Depends on:** P0-DB-07, P0-API-CAL-01
- **Acceptance:** Seed theme/chapter sequence × teaching days for School X.

### P1-DB-02 — `map_slices.outcome_refs` FK integrity
- **Area:** Database
- **Depends on:** P1-DB-01, P0-DB-05
- **Acceptance:** Refs resolve to seeded pre-primary `outcomes` (placeholder OK).

---

## Backend

### P1-API-YMAP-01 — `YearlyMapModule` deterministic placement
- **Area:** Backend
- **Depends on:** P0-DB-07, P0-DB-04
- **Acceptance:** No AI; theme-led distribution + terminal-close consolidation window.
- **Invariant:** Deterministic stays deterministic.

### P1-API-PLAN-01 — `PlanningCascadeModule`
- **Area:** Backend
- **Depends on:** P1-API-YMAP-01
- **Acceptance:** Monthly auto → weekly Sunday adjust → daily pre-filled.

### P1-API-LESSON-01 — `LessonModule` generate
- **Area:** Backend
- **Depends on:** P1-API-AI-01, P1-API-PLAN-01
- **Acceptance:** Haiku grounded in day's `map_slice` + book; pedagogy rule not model choice.

### P1-API-AI-01 — `AiOrchestrationModule`
- **Area:** Backend
- **Depends on:** —
- **Acceptance:** Prompt lookup by `(feature, band)` from DB; Haiku/Sonnet/none router.

### P1-API-ATT-01 — `AttendanceModule`
- **Area:** Backend
- **Depends on:** P0-DB-08, P0-API-AUTH-06
- **Acceptance:** One-tap attendance; WhatsApp confirmation to guardians.

### P1-API-OUT-01 — `OutcomesModule` + four capture paths
- **Area:** Backend
- **Depends on:** P0-DB-08, P0-API-RBAC-01, P1-API-AI-01
- **Acceptance:** Batch sweep, carry-forward, voice/text mapper, assessment activity;
  all confirm-gated. **Level is human.**

### P1-API-OUT-02 — Mapper guard tests
- **Area:** Testing
- **Depends on:** P1-API-OUT-01
- **Acceptance:** No top-band jump; ambiguous → roll number; non-observation → attendance;
  no write without confirmation. Tests fail if guards weakened.

### P1-API-PACE-01 — `PacingModule`
- **Area:** Backend
- **Depends on:** P0-DB-07, P0-DB-04
- **Acceptance:** Planned vs actual in teaching days; on track / behind / self-correcting.
  Never join to `student_outcomes` for a single health number.

### P1-API-COACH-01 — `CoachModule`
- **Area:** Backend
- **Depends on:** P1-API-AI-01
- **Acceptance:** Haiku chat; never joined to child; excluded from handover.

### P1-API-REP-01 — `ReportsModule` monthly parent report
- **Area:** Backend
- **Depends on:** P1-API-AI-01, P1-API-OUT-01
- **Acceptance:** Sonnet draft → teacher approve; thin data → neutral fallback (**no fiction**).

---

## Frontend

### P1-WEB-01 — Milestone batch-sweep UI
### P1-WEB-02 — Weekly plan review/adjust
### P1-WEB-03 — Daily lesson view
### P1-WEB-04 — Pacing indicator (three-state)
### P1-WEB-05 — Parent-report review/approve

Each depends on matching API module + P0-WEB-03. Feature folders mirror backend modules.

---

## AI / Prompts

### P1-AI-01 — Load templates #1, #2, #4 into `(feature, band)` table
### P1-AI-02 — Post-generation output validators (guards, no-label/no-rank)

---

## Testing / CI

### P1-TEST-01 — Dashain closure reflows map + pacing (self-correcting)
### P1-TEST-02 — Stalled milestone → inclusive-assistant private prompt (not admin flag)
