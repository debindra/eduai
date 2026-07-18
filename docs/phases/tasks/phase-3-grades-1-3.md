# Phase 3 — Grades 1–3 extension (tasks)

Source: [`PHASE_TASKS.md`](../../../PHASE_TASKS.md) § Phase 3.
Status: [`../status/phase-3.md`](../status/phase-3.md).

**Exit criteria:** Grade 1–3 pilot runs full remedial loop; admin open-loop
counts accurate (never named children).

---

## Database

### P3-DB-01 — `basic_early` band + E–A+ `grade_scales`
### P3-DB-02 — `student_outcomes.attempt` ENUM (`regular` / `after_support`)
- Regular-pass immutable; re-assessment inserts new row.
### P3-DB-03 — `remedial_plans` lifecycle table

---

## Backend

### P3-API-RBAC-01 — Populate `teacher_sections.subject_id` + collapse test
- Prove two-grain RLS/guards collapse to pre-primary with **zero** code changes.

### P3-API-REM-01 — `RemedialModule` state machine
- Opened → Activity delivered → Re-assessed → Escalated → Closed.
- Quiet-hours job reminders; escalation to `upcharatmak` + class-teacher notify.

### P3-API-AGG-01 — `AggregationModule`
- `Σ ÷ (4 × n) × 100` → letter grade; pure arithmetic; **zero AI**.

### P3-API-DOC-01 — Annex 2/3/4 deterministic templates in DocGen
### P3-API-METH-01 — `MethodsToolkitModule` generation-menu config

---

## Frontend

### P3-WEB-01 — Subject-teacher view (write subject / read section)
### P3-WEB-02 — Class-teacher oversight + report assembly
### P3-WEB-03 — Remedial-loop tracker (teacher named; admin counts only)

---

## Testing

### P3-TEST-01 — Full remedial loop + admin open-loop counts
### P3-TEST-02 — Cross-domain contamination (guard + RLS reject)
