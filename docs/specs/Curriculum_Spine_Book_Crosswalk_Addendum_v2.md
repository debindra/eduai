# Curriculum Spine & Book Crosswalk Addendum v2.0

**Status:** CURRENT — shapes locked from BidyaSetu Full System Report v3.3
6–8, 12–13. Supersedes Curriculum Spine & Book Crosswalk Addendum v1.0
(rated outcomes; chapter → outcomes — architecturally wrong).

**Date:** 2026-07-24

---

## 1. What this document locks

| Object | Shape |
|---|---|
| Assessable atom | `indicators` from अनुसूची ३ — never 3 outcomes |
| Aggregation chain | indicator rating (1–4) → area % → subject % → letter grade |
| Area container | `assessment_areas` (not `units`) |
| Grouping | nullable subject-configured `group_label` — never a skill enum |
| Scale | 1–4 only (Guideline 2083). English curriculum 1–5 is overruled |
| Crosswalk | `book_chapter → assessment_area` (I9), book-optional |
| Pre-primary | 11 `curriculum_areas` → 6 `rollup_domains` (separate mechanism) |

## 2. Invariants I1–I9

See CLAUDE.md 2 and `.cursor/rules/invariants.mdc`. All nine bind this
addendum. I1–I5 numbering is provisional pending v3.2 verification.

## 3. Schema objects (G1–5)

### `assessment_areas`

Replaces the freelancer/doc concept of `units`.

| Column | Notes |
|---|---|
| id | uuid PK |
| subject_id | FK subjects |
| level_id | grade level key (e.g. 4, 5) — separate rows per grade |
| code | stable area code within subject+level |
| display_label | subject-configured (Unit / Genre / विषयक्षेत्र / …) |
| grouping_shape | `skill` \| `content` \| `flat` |
| default_sequence | CDC annex area order (capture during extraction) |
| indicator_count | N from annex (I6) — source of area denominator `4 × N` |

### `indicators`

| Column | Notes |
|---|---|
| id | uuid PK |
| assessment_area_id | FK |
| level_id | must match area's level |
| code | unique within area |
| statement_en / statement_np | assessable atom text |
| group_label | nullable; skill/content label per 6.3 |
| sort_order | within area |

Identical statement text across grades = **separate rows** (I4).

### `ratings` (append-only)

| Column | Notes |
|---|---|
| id | uuid PK |
| child_id | FK |
| indicator_id | FK |
| stage | `regular` \| `additional_support` |
| rated_on | date |
| rating | 1–4 |
| capture_mode | stamped from the task (not teacher choice) |
| author_id | teacher identity |
| state | `proposed` \| `confirmed` (level is human) |
| confirmed_by / confirmed_at | set only on confirm |

Corrections = new INSERT (I7). Never UPDATE a prior confirmed rating.

### Area achievement (computed)

```
if rated_confirmed_count < assessment_areas.indicator_count:
  return { status: 'withheld', missingIndicators: [...] }
else:
  percent = Σ(rating) / (4 × N) × 100
```

No surface may render a partial percentage (I8).

### Crosswalk

```
book_chapters (publisher content)
  → chapter_area_crosswalk
  → assessment_areas
```

Engine runs fully with an empty crosswalk (I9).

## 4. Grouping shapes (6.3)

| Shape | Subjects | `group_label` carries |
|---|---|---|
| Skill-grouped | English; Nepali | L/S/R/W or सुनाइ/बोलाइ/पढाइ/लेखाइ |
| Content-grouped | Maths; Social Studies | विषयवस्तु topic rows |
| Flat | Science; Health/PE; Creative Arts | NULL — column absent on form |

## 5. Extraction gotchas (अनुसूची ३ क–च)

1. Mixed-encoded PDF (Unicode + Preeti) — visually verify every cell; never
   trust `pdftotext` alone.
2. Identical indicator statements across grades — extract as separate
   `level_id` rows.
3. Capture `default_sequence` in the same pass as text.

## 6. Grades 1–3 caveat

Guideline 2083 annexes cover Grades 4–5. G1–3 rests on Basic Level
Curriculum 2076. Shared-engine assumption expected but **forms must not be
specced** until the 2076 annex equivalent is read in-session.

## 7. Content ownership

Indicator banks and band descriptors are trainer/ECE-authored. Pilot:
Grade 4 English end-to-end before remaining five subjects at scale.
Do not synthesize bank rows in code.
