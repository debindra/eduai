# Phase 9 — BidyaSetu v3.3 Assessment Realignment

**Goal:** Align schema, engine, docs, and packs to Full System Report v3.3
(Curriculum 2077 11→6; Guideline 2083 indicator→area chain; I1–I9;
dual-render packs).

**Status:** Tracks A–D implemented in repo; Track E queued (content)  
**Depends on:** Phases 0–5 scaffolding (outcome-centric) — those remain
useful but are **not** assessment-complete against v3.3.

## Tracks

| Track | Deliverable | Status |
|---|---|---|
| A Docs & invariants | CLAUDE, skill, invariants, Crosswalk v2, Pack Spec v1.1, Identity Addendum v2 | done |
| B Pre-primary schema | curriculum_areas, rollup_domains, crosswalk, scale rename | done |
| C Indicator engine | assessment_areas, indicators, ratings, withheld aggregation, FE indicator sweep, Annex helpers | done |
| D Dual-render packs | Assessment pack pipeline (web + WA/PDF) | done |
| E Content gates | Trainer banks, G4 English, 2076 read, I1–I5 numbering | queued — see [phase-9-content-gates.md](./phase-9-content-gates.md) |

## Exit criteria

- [x] Docs point at v3.3; I1–I9 in invariants
- [x] PP 11→6 tables migrated and seeded (structure only)
- [x] G4–5 ratings attach to indicators; append-only
- [x] Incomplete area → `withheld` on aggregation helpers
- [x] Dual-render pack stub + tests
- [x] Content/verification queue documented (not silently invented)

## Notes

G1–3 forms remain gated on Basic Level Curriculum 2076 annex read.
Infrastructure phases (Swagger/CI/Sentry/Fly) may run in parallel.
