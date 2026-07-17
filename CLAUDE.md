# CLAUDE.md — EduAI Nepal (working name)

This file is read automatically by Claude Code at the start of every session in
this repo. It is the compressed, load-bearing summary of three source
documents kept in `/docs/specs/`:

- `EduAI_Full_System_Report.docx` — product/system spec, pre-primary
- `EduAI_Technical_System_Architecture_v3_1.docx` — engineering architecture, Nursery–Grade 5
- `Calendar_Curriculum_Pacing_Spec_v1.docx` — calendar/pacing data model
- `Data_Model_Identity_Addendum_v1.md` — **supersedes Architecture §3.1's
  entity list**: identity/auth model (`identities` + `school_memberships`),
  restored `curriculum_areas`/`rollup_domains`/`prompts` tables, and the
  entities §3.1 left as a "Missing entities" placeholder (consents,
  safeguarding escalations, substitute access, guardian_child_links)

**Rule: when a task touches schema, RBAC, assessment, AI prompts, or document
generation, read the relevant section of those docs (or
`skills/eduai-architecture/SKILL.md`, which indexes them) before writing code.
Do not guess at the data model from memory of this file alone — this file is
a summary, not the spec.**

---

## 1. What this system is (one paragraph)

A WhatsApp-first AI platform for Nursery–Grade 5 in Nepali private schools,
built on the publisher's own textbooks, that gives undertrained teachers the
pedagogical method they were never taught, tracks child development the way
national curricula legally require (banded milestones at pre-primary, a 1–4
CDC outcome scale at Grades 1–5), and produces every compliance document as a
deterministic render from live rows. Three legally distinct assessment
regimes run on **one engine**, driven entirely by configuration rows, not by
grade-conditional code branches. Underneath all of it sits one calendar per
school — every planning horizon (yearly → monthly → weekly → daily), every
pacing view, and every reporting trigger is calendar-derived; the calendar
is the coordinate system the curriculum is plotted onto, not a peripheral
feature (Calendar spec 1). Child is never a user. The child never touches a
screen.

## 2. Non-negotiable invariants

These are correctness bugs, not style preferences, if violated. A PR that
violates any of these should be rejected regardless of what else it does well.

1. **The level is human.** No code path may write a final milestone state or
   outcome rating without an explicit confirming teacher action. AI/mapper
   output is always a *proposal* row, never a *confirmed* row.
2. **No rank-order queries, anywhere, ever.** No view, endpoint, or ad hoc
   query may accept an ordering operation over a rating/percentage/letter
   grade across more than one child or one teacher. This is enforced in code
   (Section 5.3 of the architecture doc), not left to RLS or UI convention.
   Add the CI lint rule described there before merging any query that touches
   `student_outcomes` or its aggregates.
3. **The gravity rule.** Data flows to the closest responsible person, no
   further: teacher → her own students; admin → practice-level aggregates
   only (counts/shapes, never band or rating distributions, never names);
   platform ops → cross-school aggregates only, per-child access requires an
   audited consented session.
4. **Band-as-data.** Grade-dependent behaviour (assessment unit, aggregation
   formula, grade table, visible features, prompt text) is a row in `bands`,
   `grade_scales`, `outcomes`, or a feature-flag join table — never a
   grade-number `if`/`switch` in application code. Adding a future band
   (e.g. Grade 6–8) must require zero schema migrations, only new rows.
5. **Calendar and curriculum are separate layers — don't conflate them.**
   The calendar owns dates (session, terminals, closures, teaching-day
   count) and knows no content. The curriculum owns sequence (chapter/theme/
   outcome order) and knows no dates. They meet at exactly one point, the
   `yearly_map`/`map_slices` join, which is where "what is taught, and
   when" gets decided per school. Code that hardcodes a date into curriculum
   logic, or a chapter/subject into calendar logic, is violating this
   separation regardless of which module it's in.
6. **`teaching_days` is always derived, never stored.** It's a computed view
   (calendar span minus weekly offs minus closures), recomputed on read, not
   a persisted count — so a single calendar edit (a new local festival, an
   extended break) correctly reflows every terminal's denominator, every
   teacher's plan, and every pacing "days left" readout in one move. Never
   add a cached/stored teaching-day count field; it will drift.
7. **A terminal boundary is a coverage-and-reporting event, never an exam.**
   There is no test-date concept anywhere in the calendar or assessment
   schema for Nursery–Grade 5, by design — the `terminals` table stores
   `start_date`/`end_date`/`reporting_type` only. Do not add a field, view,
   or feature that implies a test is scheduled on a terminal boundary.
8. **Coverage and learning are tracked separately, never conflated.**
   Marking a lesson `done` in `lesson_progress` means "I taught this," not
   "the children learned this" — that's the outcome/milestone tracker's job,
   continuously, across the whole terminal. A pacing view and an assessment
   view must never be merged into one "how is this class doing" number.
9. **Two-grain RLS from Grade 1.** Write scope is `(section_id, subject_id)`;
   read scope for a class-teacher row is section-wide. Pre-primary collapses
   to `subject_id = NULL`, `is_class_teacher = true` — do not special-case it,
   let the same RLS policy cover it.
10. **Schema exclusions are permanent, not a v1 gap.** No personality/trait/
    risk-category field on `child`, at any band. No numeric score for
    pre-primary (`assessment_mode` on the band row enforces the value domain).
    Classroom-coach conversation content is never joined to a child record and
    is excluded from `handover_pack` snapshots.
11. **Four mapper guards, on every capture path, every band:** never jump to
    the top band/rating from one sighting; ambiguous name matches return
    roll-number candidates, never a guess; a non-observation (e.g. an absence
    note) routes to attendance, never becomes an outcome candidate; nothing
    writes a final state except explicit teacher confirmation. These should be
    automated tests that fail if the guard is weakened, shared across all four
    capture paths (batch sweep, carry-forward, free-text/voice, assessment
    activity) rather than reimplemented per path.
12. **No fiction.** Report generation is constrained to evidence actually
    recorded for the period. Thin data → neutral fallback template, never a
    generated placeholder narrative.
13. **Deterministic stays deterministic.** Aggregation (`Σ ÷ (4 × n) × 100` →
    letter grade), Annex 2/3/4/inspection-pack rendering, and pacing-gap
    calculation are pure arithmetic/template code with **zero AI calls**. Do
    not "improve" these with an LLM call — that is a regression, not a
    feature. (The yearly-map generator that distributes curriculum sequence
    across a terminal's teaching days is likewise a deterministic placement
    algorithm, not a generative one — see Calendar spec 3.)
14. **Safeguarding fast-path bypasses everything.** Any detected signal of
    possible harm routes immediately to class teacher + principal with
    mandatory human review, at every band, with no volume cap and no waiting
    on the normal remedial/stall cadence.
15. **No cross-domain contamination.** A shy or second-language child's
    inability to speak must never drag down an unrelated subject's band/
    rating. Enforced two ways, both required: at the outcome-authoring level
    (observable text can't require competence outside its own subject) and at
    the RLS level (a subject teacher literally cannot write outside her own
    subject).
16. **Generation parity.** Free-tier and Pro-tier teachers requesting the same
    lesson/remedial activity get pedagogically identical output. Tiers gate
    volume and integrations, never quality.

## 3. Tech stack (as specified — don't substitute without discussion)

| Layer | Choice |
|---|---|
| Core API | Node.js / NestJS |
| DB | Supabase PostgreSQL (system of record, RLS-enforced) |
| File storage | Cloudflare R2 (photos, generated PDFs/docx) |
| Cache | Upstash Redis, 30-day TTL, content-keyed |
| Jobs | Inngest or Trigger.dev (durable, step-based) |
| Web companion | SvelteKit + Tailwind CSS |
| Messaging/identity | Meta WhatsApp Cloud API (primary), Twilio Verify/MSG91 (SMS OTP fallback) |
| AI — live/interactive | Claude Haiku (phonics, lesson gen, coach, remedial/methods-toolkit activities, outcome mapping) |
| AI — narrative | Claude Sonnet (monthly/year-end parent reports, Annex 4 addendum) |
| Observability | Sentry + Axiom (or Better Stack) |
| Hosting | Fly.io or GCP Cloud Run, in-region (Mumbai/asia-south1 or Singapore) |

Two locked rendering-environment facts (treat as hard requirements, not
config): Devanagari rendering needs `fonts-noto-core` baked into the
document-rendering service's base image; the docx library in use swaps
page width/height on landscape orientation — apply the corrective transform
as one shared utility, not per-template.

## 4. Where things live (target repo layout)

```
/apps/api            core API service (NestJS)
/apps/web             SvelteKit web companion + parent portal
/apps/docgen           deterministic document-rendering service (isolated —
                       needs fonts-noto-core + landscape fix, Section 6.2)
/apps/jobs             Inngest/Trigger.dev workflow functions
/packages/db          Supabase schema, migrations, RLS policies — includes
                       the calendar tables (school_calendars, terminals,
                       calendar_closures, yearly_map, map_slices,
                       lesson_progress; Calendar spec 6) alongside the band
                       config tables. Same package, same migration history —
                       the calendar is foundational schema, not a bolt-on.
/packages/ai          prompt templates keyed by (feature, band), orchestration
/docs/specs           the source docs (docx read-only reference) + the
                       data-model/identity addendum (markdown, maintained)
/skills/eduai-architecture/SKILL.md   deep reference index for Claude Code
```

## 5. Working conventions for Claude Code in this repo

- Identity & authorization: web login is username + password (primary),
  with phone + OTP (WhatsApp primary, SMS fallback) as the secondary web
  option, the recovery path, and the WhatsApp channel's inherent identity.
  Both credential paths resolve to the same `identities` row; tenancy lives
  in `school_memberships` (identity × school × member_type), and
  authorization always resolves membership (tenant check first) → scoped
  role (`teacher_sections` for teachers, `guardian_child_links` for
  guardians, member_type for admins). Never authorize from a flat role
  column, and never give the child a login. See the Data Model & Identity
  Addendum §2.
- Pre-primary taxonomy is two-layer: milestones/outcomes tag against the 11
  Curriculum 2077 skill areas (`curriculum_areas`, system of record), which
  roll up via a crosswalk to the 6 parent-facing domains (`rollup_domains`).
  Teachers/admins may see all 11 areas; parents and principals see the 6
  domains. Don't overload `subjects` to fake this, and don't compute the
  rollup in report code — it's a data crosswalk.
- When touching `student_outcomes`, `remedial_plans`, or any aggregate query:
  read Architecture 4 and 5.3 first, and confirm the CI lint / RLS test
  exists for the new query before considering the task done.
- When adding a new band or grade config: follow the worked example in
  Architecture 2.4 — new rows only, no new code path. If you find yourself
  writing a grade-number conditional, stop and push the distinction into a
  `bands` row instead.
- When writing an AI prompt for a new feature: look up (or add) a
  `(feature_id, band_id)` prompt template row rather than inlining band logic
  into a JS/TS string. See `/prompts/ai-prompt-templates.md` for the current
  starter set and the output-constraint checklist (Architecture 7.4).
- When generating a document: confirm it's implemented as a deterministic
  render over live rows (Section 6.1's table says which documents are
  deterministic vs AI-drafted-then-approved) — don't reach for an LLM call by
  default.
- Never invent a milestone/outcome bank entry. The 138-milestone pre-primary
  bank and the Grades 1–5 outcomes bank are content-authoring deliverables
  owned by trainers/an ECE specialist, not something to synthesize in code.
- Treat "EduAI Nepal" as a placeholder name throughout code, comments, and
  generated artifacts — do not let it leak into anything parent- or
  school-facing without flagging it.

## 6. Known open items (don't silently resolve these — surface them)

From System Report Part X and Architecture 13.2:
- The 138-milestone pre-primary bank needs trainer/ECE-specialist review.
- Grades 4–5 outcomes bank is unresolved (Grades 1–3 is resolved).
- Nepali/code-switched voice transcription is a pilot go/no-go, not a given.
- Whole-school vs. Grades-4–5-only go-to-market sequencing is an open
  business decision the architecture supports either way — don't hardcode
  an assumption about onboarding order.
- BS↔AD date conversion library for the calendar needs confirming.
- The national festival template (pre-filled closure set, movable dates like
  Dashain) needs sourcing and a yearly refresh owner — don't hardcode a
  single year's dates.
- The yearly-map generator needs each theme/chapter's teaching-day weighting
  from the same trainer review that owns the outcome banks — treat this as a
  content dependency, not something to eyeball in code.
