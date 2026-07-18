# Phase 2 — Pre-primary compliance + school/parent layers (tasks)

Source: [`PHASE_TASKS.md`](../../../PHASE_TASKS.md)  Phase 2.
Status: [`../status/phase-2.md`](../status/phase-2.md).

**Exit criteria:** full compliance cycle on demand for a pilot section;
substitute confirmation blocked (403/guard test, not hidden button).

---

## Backend

### P2-API-DOC-01 — `DocGenModule` (isolated service)
- Assessment log (deterministic), year-end developmental report (Sonnet then approve),
  transition file (deterministic), inspection pack (batch).
- **Invariant:** fonts-noto-core + landscape fix in docgen image only.

### P2-API-ADMIN-01 — `AdminModule` gravity-shaped dashboard
- Coverage/shapes only; pacing altitude (sections-behind); never teacher league table.
- Depends on: P0-API-RBAC-02

### P2-API-MGMT-01 — `ManageModule`
- Settling programme; substitute pack (guard-blocked confirm); catch-up from
  `lesson_progress` × `attendance_record`; festival planner from `calendar_closures`.

### P2-API-MSG-01 — `MessagingModule`
- Two-way WhatsApp per family; FAQ-bot; teacher-queue drafts; admin fees/complaints.

### P2-API-HAND-01 — `HandoverModule`
- Materialized `handover_pack`; coach-chat structurally excluded.

### P2-API-EXIT-01 — Exit/retention
- Per-child export, leaving packs, deletion-after-window job.

---

## Frontend

### P2-WEB-01 — Admin compliance dashboard (counts/shapes)
### P2-WEB-02 — Messaging inbox (teacher + admin queues)
### P2-WEB-03 — PTM-prep + event planner
### P2-WEB-04 — Parent portal (six-domain + portfolio)
- **Open item:** parent web access mechanism (magic-link vs none) unresolved in CLAUDE.md — confirm before building.

---

## Testing

### P2-TEST-01 — Curriculum-2077 cycle
- Assessment log → year-end → transition → inspection; `document_render.source_row_hash` traceability.
