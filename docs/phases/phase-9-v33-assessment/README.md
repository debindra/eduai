# Phase 9 — BidyaSetu v3.3 Assessment Realignment

Implements Full System Report v3.3 alignment. Status lives in
[`../status/phase-9.md`](../status/phase-9.md).

| Track | Summary |
|---|---|
| A | Docs, invariants I1–I9, Crosswalk v2, Pack Spec v1.1, Identity Addendum v2 |
| B | Curriculum 2077 `curriculum_areas` / `rollup_domains` + scale rename |
| C | `assessment_areas` / `indicators` / append-only `ratings` + `withheld` |
| D | Dual-render assessment pack (web + WhatsApp/PDF) |
| E | Content gates — [phase-9-content-gates.md](../status/phase-9-content-gates.md) |

Migrations:

- `packages/db/supabase/migrations/20250718310000_phase9_curriculum_2077_areas.sql`
- `packages/db/supabase/migrations/20250718320000_phase9_indicator_engine.sql`
