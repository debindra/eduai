---
name: eduai-architecture
description: Use this skill whenever working on the EduAI Nepal codebase and the task touches the data model, RBAC/RLS, the assessment or remedial workflow, AI prompt orchestration, document generation (Annex 2/3/4, portfolio, inspection pack), the academic calendar/pacing tracker, or any product rule about what may or may not appear in a child's record. Also use it before answering questions about "why is the system built this way" for this project, or before adding a new grade band/feature, since the answer is almost always "it's already a documented pattern — extend it, don't invent a new one." Do not use this skill for generic Node/NestJS/Supabase/SvelteKit questions unrelated to this project's specific domain rules.
---

# EduAI Nepal — Architecture Reference

Source of truth: four docs in `/docs/specs/` —
`EduAI_Full_System_Report.docx` (product/pedagogy/legal grounding),
`EduAI_Technical_System_Architecture_v3_1.docx` (engineering),
`Calendar_Curriculum_Pacing_Spec_v1.docx` (calendar/pacing), and
`Data_Model_Identity_Addendum_v1.md` (supersedes Architecture §3.1's entity
list: identity/auth model, `curriculum_areas`/`rollup_domains`/`prompts`
tables, consents, safeguarding escalations, substitute access). This skill
is an index into them, not a replacement — for anything load-bearing, open
the actual section cited.

## The two things to internalize first

**1. A band is rows, not code.** Pre-primary (three-state narrative
milestones), Grades 1–3 (four-level CDC scale), and Grades 4–5 (extension of
the same scale) run on one engine because `assessment_mode`,
`aggregation_rule`, prompt templates, feature flags, and document templates
are all configuration rows keyed by `band_id`, never grade-number branches in
application code. Before writing any grade-conditional logic, ask: "is this
actually a new row in `bands`/`grade_scales`/`outcomes`/a feature-flag
table?" It almost always is (Architecture 2, worked example in 2.4).

**2. A calendar is rows too — time-as-data, the same discipline applied to
dates.** The calendar (dates: session, terminals, closures) and the
curriculum (sequence: chapters, themes, outcomes) are deliberately separate
layers that meet at exactly one join point, the `yearly_map`. Everything
downstream — a teacher's plan at every horizon, the pacing tracker, "this
month's active milestones," when a mandated report fires — is calendar-
derived, not independently computed. `teaching_days` is always a computed
view, never a stored count, precisely so one calendar edit reflows
everything at once (Calendar spec 1, 6). Treat this with the same rigor as
band-as-data: if you're hardcoding a date into pedagogy logic, or content
into calendar logic, stop.

## Quick index by task

**Adding/editing a table that touches a child or teacher** → Data Model &
Identity Addendum (the authoritative entity list, layered in RLS evaluation
order — supersedes Architecture 3.1), then Architecture 3.2 (fields the
schema *must not* have — personality, trait, risk-category, rank, teacher
competence score), 3.3 (RLS grains).

**Who is a user / login / role question** → Data Model & Identity Addendum
§2: `identities` (web login = username + password primary; phone + OTP is
the secondary web option, recovery path, and WhatsApp-channel identity —
both resolve to the same row) → `school_memberships` (tenant join,
member_type: teacher / admin / guardian / trainer_viewer) → scoped role
(`teacher_sections` for teachers, `guardian_child_links` for guardians,
member_type for admins). Never authorize from a flat role column; the child
is never a user. Substitute access, consents, and safeguarding escalations
are rows (addendum §3a/§3e), not conventions.

**Which area/domain does a milestone belong to** → the two-layer taxonomy:
`curriculum_areas` (11 Curriculum 2077 skill areas, system of record; CDC
subjects from Grade 1) roll up via `area_domain_crosswalk` to the 6
parent-facing `rollup_domains`. Teachers/admins may see all 11; parents and
principals see the 6. Crosswalk content is trainer/ECE-owned — seed
structure only.

**Anything about who confirms an assessment, and how** → System Report 4.2
(four capture paths, conservative mapper rules), Architecture 4.4 (the same
four guards as CI-testable rules) and 4.1 (two-pass record via `attempt`
ENUM, not two tables).

**A child isn't improving on a skill** → System Report 4.4 (pre-primary:
velocity-based stall detection, point-to confound check first, private to
class teacher, never aggregated into a "behind" score, harm signals skip the
ladder). Architecture 4.2 (Grades 1–5: the remedial-ladder state machine —
Opened → Activity delivered → Re-assessed → Escalated → Closed) and 9
(job-engine workflows that drive the reminders/escalation).

**Who can see what** → System Report Part VIII "the gravity rule" and
Architecture 5 (role → scope mapping table) and 5.3 (rank-order queries
are blocked in code + CI lint, not just RLS).

**A new document or report** → Architecture 6.1 (table of every document,
its source, and whether it's deterministic or AI-drafted-then-approved) and
6.2 (two locked rendering-environment facts: fonts-noto-core, docx
landscape swap).

**An AI prompt or model choice** → Architecture 7 (orchestration
responsibilities, model-tier routing table, caching strategy) and 7.4
(output constraints every generation path must enforce).

**"When is X due" / "is a class behind"** → Calendar spec 5 (planned vs.
actual position, pacing gap in teaching days, three states: on track /
behind / self-correcting) and 6 (calendar data model — `teaching_days` is
always a derived view, never a stored count, so an edit reflows everything).
Critical firewall: a terminal boundary is a coverage/reporting event, never
an exam date — there is no test-date field anywhere in this schema, by
design. Everything downstream reads this spine rather than recomputing it:
the assessment pack's "active this month" milestones/outcomes, the catch-up
pack (what an absent child missed — a query over `lesson_progress` against
attendance), the weekly view's festival rehearsals, and the diary's closure
explanations all read `map_slices`/`calendar_closures` directly (Calendar
spec 7). Don't hand-roll a second "what's due" calculation anywhere.

**A teacher's daily/weekly lesson plan** → System Report 3.1 (the teacher's
day walkthrough — nothing is planned from a blank page at any horizon) and
Calendar spec 4 (the derived-plan cascade: yearly → monthly → weekly →
daily, each horizon a single tap from the one above). The *placement* of
content in time (yearly-map generation) is deterministic; the *drafting* of
a specific day's lesson content is generative (Haiku) — see prompt template
#4 in `/prompts/ai-prompt-templates.md`. Don't conflate the two.

**Cost/caching questions** → Architecture 12. The two structural cost
advantages of the Grades 1–5 extension: compliance documents are zero-AI-cost
by architecture, and the remedial-activity cache is expected to have an
unusually high hit rate because misconceptions repeat across thousands of
classrooms nationally.

## Non-negotiables (see also CLAUDE.md / .cursor/rules/00-invariants.mdc + 40-calendar-pacing.mdc)

1. The level is human — AI proposes, teacher confirms, always.
2. No rank-order queries over any child or teacher, enforced in code + CI.
3. Gravity rule — data flows to the closest responsible person, no further
   (applies to pacing/coverage views too, not just outcomes).
4. Band-as-data — no grade-number branches in pedagogy/assessment/report code.
5. Calendar and curriculum are separate layers, joined only at `yearly_map`.
6. `teaching_days` is always derived, never stored.
7. A terminal boundary is a coverage/reporting event, never an exam — no
   test-date field exists in this schema, at any band, by design.
8. Coverage (`lesson_progress`) and learning (`student_outcomes`) are
   tracked separately and never merged into one number.
9. Two-grain RLS from Grade 1 — `(section_id, subject_id)` write, section-wide
   class-teacher read.
10. No personality/trait/risk-category schema fields, ever, at any band.
11. Four mapper guards on every capture path, every band.
12. No fiction — thin data triggers the neutral fallback, never a generated
    placeholder.
13. Deterministic documents stay deterministic — no LLM call in the
    aggregation/Annex/inspection-pack/pacing-gap path.
14. Safeguarding fast-path bypasses every queue, every band, no cap.

## Things this project deliberately does NOT do (don't "fix" these)

- No exam or test-date concept anywhere in the calendar or assessment schema
  for Nursery–Grade 5 — this is a legal/pedagogical constraint, not a gap.
- No teacher leaderboard, no cross-teacher outcome comparison — the rater is
  the measured; comparing would corrupt the incentive.
- No AI-authored milestone/outcome bank content — that's a
  trainer/ECE-specialist deliverable, tracked as an open item, not something
  to generate synthetically even for "placeholder" purposes.
- No localStorage/browser-storage assumptions leaking into the web companion
  from example/demo code — this is a schools/child-data product; state lives
  server-side per the RLS-enforced Postgres model.

## Open items to keep surfacing, not silently resolve

Grades 4–5 outcomes bank unresolved (Grades 1–3 is resolved). Nepali/
code-switched voice transcription is a pilot go/no-go with mandatory
confirm-back. BS↔AD calendar conversion library not yet confirmed. Go-to-
market sequencing (whole-school vs. Grades-4–5-only wedge) is an open
business decision — the architecture supports either, don't hardcode one.
National festival template (movable dates like Dashain) needs sourcing and a
yearly refresh owner. The yearly-map generator's curriculum → teaching-day
weighting needs sourcing from the same trainer review that owns the outcome
banks — until then, don't guess at chapter/theme weights in code.
