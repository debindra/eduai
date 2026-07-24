---
name: eduai-architecture
description: Use this skill whenever working on the EduAI Nepal / BidyaSetu codebase and the task touches the data model, RBAC/RLS, the assessment or remedial workflow, AI prompt orchestration, document generation (Annex 2/3/4, portfolio, inspection pack), the academic calendar/pacing tracker, or any product rule about what may or may not appear in a child's record. Also use it before answering questions about "why is the system built this way" for this project, or before adding a new grade band/feature, since the answer is almost always "it's already a documented pattern — extend it, don't invent a new one." Do not use this skill for generic Node/NestJS/Supabase/Svelte questions unrelated to this project's specific domain rules.
---

# EduAI Nepal / BidyaSetu — Architecture Reference

Source of truth in `/docs/specs/`:

- `BidyaSetu_Full_System_Report_v3.3.docx` — **CURRENT** product/system
  (supersedes v3.1/v3.2). Curriculum 2077 11→6; Guideline 2083 indicator
  engine; I1–I9; dual-render packs.
- `EduAI_Technical_System_Architecture_v3_1.docx` — engineering (entity
  list superseded by `Data_Model_Identity_Addendum_v2.md` where they
  conflict)
- `Calendar_Curriculum_Pacing_Spec_v1.docx` — calendar/pacing
- `Curriculum_Spine_Book_Crosswalk_Addendum_v2.md` — chapter → area
- `Assessment_Pack_Spec_v1.1.md` — dual-render rule

This skill is an index — for anything load-bearing, open the cited section.

## The three things to internalize first

**1. A band is rows, not code.** Pre-primary (three-state milestones),
Grades 1–3 and 4–5 (1–4 indicator scale, different letter maps) run on one
engine because `assessment_mode`, `aggregation_rule`, prompts, and
templates are configuration rows keyed by `band_id`.

**2. A calendar is rows too.** Calendar (dates) and curriculum (sequence)
meet only at `yearly_map`. `teaching_days` is always derived, never stored.

**3. The assessable atom (G1–5) is the indicator, not the 3 outcome.**
Ratings attach to `indicators` → area % (or `withheld`) → subject % →
letter. Pre-primary is a separate mechanism: milestones tagged to 11
`curriculum_areas`, rolled up to 6 `rollup_domains` for parents. ELDS is a
validation anchor only — Curriculum 2077 is the organising taxonomy.

## Quick index by task

**Adding a new backend feature** → `ARCHITECTURE.md` Part 1 — NestJS
modular monolith, Propose/Confirm, state machines, Ports & Adapters.
Inject another module's *service*, never its *repository*.

**Adding a new frontend feature** → `ARCHITECTURE.md` Part 2 — Svelte 5
SPA, feature folders mirroring backend. Route checks are UX only.

**Finishing any feature (testing DoD)** → `ARCHITECTURE.md` Part 3,
`.cursor/rules/testing.mdc`, `skills/testing-patterns/SKILL.md`.

**Schema touching child/teacher** → Identity Addendum v2 + Architecture
3.2 exclusions + 3.3 RLS. For G1–5 ratings see Crosswalk Addendum v2.

**Who confirms an assessment** → v3.3 5.3 / 6; Propose/Confirm; four
mapper guards. G1–5 writes confirmed rows only to append-only `ratings`.

**Aggregation / Annex %** → I6–I8: annex N, append-only, `withheld` on
incomplete areas. Pure arithmetic — zero AI. See
`apps/api/src/modules/aggregation/`.

**Assessment pack** → Assessment Pack Spec v1.1 — dual-render mandatory.

**Book ↔ assessment** → Crosswalk Addendum v2: `book_chapter →
assessment_area` (I9), book-optional.

**Scale 1–5 vs 1–4** → Guideline 2083 wins. Do not build a mapping layer
(v3.3 8).

**Who can see what** → Gravity rule; Architecture 5; no rank-order (5.3).

**G1–3 forms** → Do not spec until Basic Level Curriculum 2076 annex is
read (v3.3 6.9).

## Non-negotiables (see CLAUDE.md + `.cursor/rules/invariants.mdc`)

1. Level is human — AI proposes, teacher confirms.
2. No rank-order queries.
3. Gravity rule.
4. Band-as-data.
5. Calendar ⊥ curriculum (join only at `yearly_map`).
6. `teaching_days` derived.
7. Terminal ≠ exam.
8. Coverage ≠ learning.
9. Two-grain RLS.
10. No personality/trait/risk fields.
11. Four mapper guards.
12. No fiction.
13. Deterministic docs stay deterministic.
14. Safeguarding fast-path.
15. No cross-domain contamination.
16. Generation parity.
17. I1–I9 assessment engine rules (indicator atom, 1–4, group_label,
    per-level rows, two-stage form, annex N, append-only, withheld,
    chapter→area).
18. Assessment Pack dual-render.

## Deliberately not done (don't "fix")

- No exam/test-date concept for Nursery–Grade 5.
- No teacher leaderboard / cross-teacher outcome comparison.
- No AI-authored milestone/indicator/descriptor bank content.
- No partial area percentages on any surface.
- No re-platform to Express/Bubble — NestJS + Svelte is the engineering SoT.

## Open items to surface, not silently resolve

Trainer/ECE review of 138 PP bank; G4 English descriptor pilot; 2076 annex
read for G1–3; I1–I5 numbering check vs v3.2; parent signature routing;
WTP / WhatsApp-vs-Viber; final brand name; BS↔AD library; festival template
owner; yearly-map teaching-day weights.
