# Data Model & Identity Addendum v2

**Status:** CURRENT — folds BidyaSetu Full System Report v3.3 5 / 12
data-layer deltas. Supersedes `Data_Model_Identity_Addendum_v1.md` for the
entity list where they conflict. Identity/auth sections from v1 remain
authoritative unless noted.

**Date:** 2026-07-24

---

## 1. What changed from v1

| Topic | v1 | v2 (v3.3) |
|---|---|---|
| Pre-primary taxonomy | `curriculum_areas` / `rollup_domains` described, not migrated | Migrated; 11→6 is system of record |
| G1–5 rated atom | `student_outcomes` on `outcomes` | **`ratings` on `indicators`** — outcome-level rating is architecturally wrong |
| Area layer | Absent | `assessment_areas` with annex `indicator_count` |
| Aggregation | Flat mean over outcomes | Area-complete → subject → letter; incomplete → `withheld` |
| Pre-primary scale | emerging / developing / secure | not_yet / developing / can_do (+ not_observed) |
| Crosswalk | chapter → outcomes (wrong) | book_chapter → assessment_area |

Identity model (`identities`, `school_memberships`, invite/password flows)
is unchanged from v1 2.

## 2. Configuration layer (band-as-data)

| Entity | Notes |
|---|---|
| `bands` / `subjects` / `band_subjects` / `grade_scales` | Unchanged pattern |
| `curriculum_areas` | 11 Curriculum 2077 skill areas (pre-primary SoR) |
| `rollup_domains` | 6 parent-facing domains D1–D6 |
| `area_domain_crosswalk` | area_id → domain_id |
| `outcomes` | Pre-primary milestones (`framework='milestone'`) with `curriculum_area_id`. G1–5 3 outcomes may exist as catalog/aggregation references but are **not** the rated atom. |
| `assessment_areas` | G1–5 area containers (replaces doc-era `units`) |
| `indicators` | Assessable atoms; keyed by level_id + area |
| `prompts` / `feature_flags` | Unchanged |

## 3. Pedagogy spine

| Entity | Notes |
|---|---|
| `child` | Unchanged exclusions (no personality/trait/risk) |
| `ratings` | Append-only indicator ratings; propose→confirm; stages regular / additional_support |
| `student_outcomes` | Legacy / pre-primary milestone capture path during transition; do not extend as G1–5 rating store |
| `remedial_plans` | Prefer linkage to indicator ratings for G1–5 going forward |
| `portfolio_items` / `attendance_record` / `lesson_progress` | Unchanged intent |

## 4. Aggregation (deterministic, zero AI)

```
latest confirmed rating per indicator (per stage policy)
  → per area: if all N indicators rated then Σ/(4×N)×100 else withheld
  → subject % / letter via grade_scales (band-as-data)
```

I6–I8 bind every surface. Partial area percentages are forbidden.

## 5. What this addendum does NOT change

Every Architecture 3.2 exclusion stands: no personality/trait/risk fields;
no numeric score at pre-primary; no rank-order query path; no teacher
competence score; no exam/test-date entity. Gravity, two-grain RLS, and
"level is human" remain.
