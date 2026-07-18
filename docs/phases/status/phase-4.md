# Phase 4 — Status

Updated: 2026-07-18

**Exit criteria (engineering):** Grade 4–5 section runs Phase 3 pipeline with
zero new backend code — only new rows. **Met for engineering slice.**

**Content gate (pilot):** Real Grades 4–5 outcomes bank + final NG–A+ cut-offs
and seven-subject list still need trainer/ECE (CDC) sign-off. Placeholder
outcomes / provisional scales are structural fixtures only.

| ID | Status | Evidence | Updated |
|---|---|---|---|
| P4-DB-01 | done | `20250718200000_phase4_grades_4_5.sql` basic_upper + 1–4 rating + provisional NG–A+ letter scales | 2026-07-18 |
| P4-DB-02 | done | same migration: seven `band_subjects` (5 reused + health_pe + local_subject, provisional) | 2026-07-18 |
| P4-API-01 | done | Audit: no grade-number branches in aggregation/remedial/docgen/guards; `assessment_mode`/`aggregation_rule` identical to basic_early | 2026-07-18 |
| P4-API-02 | done | `two-grain-collapse.spec.ts` basic_upper allow + cross-domain reject (health_pe ↛ local_subject) | 2026-07-18 |
| P4-TEST-01 | done | `aggregate.spec.ts` NG–A+ fixtures; `pnpm --filter @eduai/api test` 152 passed | 2026-07-18 |
