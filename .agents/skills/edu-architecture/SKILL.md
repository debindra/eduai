---
name: eduai-architecture
description: Use this skill whenever working on the EduAI Nepal codebase and the task touches the data model, RBAC/RLS, the assessment or remedial workflow, AI prompt orchestration, document generation (Annex 2/3/4, portfolio, inspection pack), the academic calendar/pacing tracker, or any product rule about what may or may not appear in a child's record. Also use it before answering questions about "why is the system built this way" for this project, or before adding a new grade band/feature, since the answer is almost always "it's already a documented pattern — extend it, don't invent a new one." Do not use this skill for generic Node/NestJS/Supabase/SvelteKit questions unrelated to this project's specific domain rules.
---

# EduAI Nepal — Architecture Reference

Source of truth: four docs in `/docs/specs/` —
`EduAI_Full_System_Report.docx` (product/pedagogy/legal grounding),
`EduAI_Technical_System_Architecture_v3_1.docx` (engineering),
`Calendar_Curriculum_Pacing_Spec_v1.docx` (calendar/pacing), and
`Data_Model_Identity_Addendum_v1.md` (supersedes Architecture 3.1's entity
list: identity/auth model, `curriculum_areas`/`rollup_domains`/`prompts`
tables, consents, safeguarding escalations, substitute access). This skill
is an index into them, not a replacement — for anything load-bearing, open
the actual section cited.

## The one thing to internalize first

**A band is rows, not code.** Pre-primary (three-state narrative milestones),
Grades 1–3 (four-level CDC scale), and Grades 4–5 (extension of the same
scale) run on one engine because `assessment_mode`, `aggregation_rule`,
prompt templates, feature flags, and document templates are all configuration
rows keyed by `band_id`, never grade-number branches in application code.
Before writing any grade-conditional logic, ask: "is this actually a new row
in `bands`/`grade_scales`/`outcomes`/a feature-flag table?" It almost always
is (Architecture 2, worked example in 2.4).

## Quick index by task

**Adding/editing a table that touches a child or teacher** → Data Model &
Identity Addendum (the authoritative entity list — supersedes Architecture
3.1), then Architecture 3.2 (fields the schema *must not* have —
personality, trait, risk-category, rank, teacher competence score), 3.3
(RLS grains).

**Who is a user / login / role question** → Data Model & Identity Addendum
2: `identities` (web login = username + password primary; phone + OTP as
secondary web option, recovery, and WhatsApp-channel identity) →
`school_memberships` (tenant join, member_type) → scoped role
(`teacher_sections`, `guardian_child_links`, member_type for admins).
Never a flat role column; the child is never a user.

**Which area/domain does a milestone belong to** → `curriculum_areas` (11
Curriculum 2077 skill areas, system of record) roll up via
`area_domain_crosswalk` to the 6 parent-facing `rollup_domains`.
Teachers/admins may see all 11; parents and principals see the 6.

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
design.

**Cost/caching questions** → Architecture 12. The two structural cost
advantages of the Grades 1–5 extension: compliance documents are zero-AI-cost
by architecture, and the remedial-activity cache is expected to have an
unusually high hit rate because misconceptions repeat across thousands of
classrooms nationally.

## Non-negotiables (see also CLAUDE.md / .cursor/rules/00-invariants.mdc)

1. The level is human — AI proposes, teacher confirms, always.
2. No rank-order queries over any child or teacher, enforced in code + CI.
3. Gravity rule — data flows to the closest responsible person, no further.
4. Band-as-data — no grade-number branches in pedagogy/assessment/report code.
5. Two-grain RLS from Grade 1 — `(section_id, subject_id)` write, section-wide
   class-teacher read.
6. No personality/trait/risk-category schema fields, ever, at any band.
7. Four mapper guards on every capture path, every band.
8. No fiction — thin data triggers the neutral fallback, never a generated
   placeholder.
9. Deterministic documents stay deterministic — no LLM call in the
   aggregation/Annex/inspection-pack path.
10. Safeguarding fast-path bypasses every queue, every band, no cap.

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
