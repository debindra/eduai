# EduAI Nepal — Build Plan

Grounded in the current build status reported in the specs (pre-primary MVP
partially exists; Grades 1–3 config is resolved; Grades 4–5 is not) rather
than a from-scratch assumption. Sequencing follows the dependency chain the
docs themselves describe: calendar → band-as-data schema → pre-primary loop
→ compliance/reporting → Grades 1–3 extension → Grades 4–5 extension →
polish/scale.

## Phase 0 — Reconcile and lock foundations (1–2 weeks)

Goal: know exactly what exists before building more on top of it.

- Reconcile the reported MVP repo (webhook, router, three MVP features,
  cache, observation mapper with four guard tests) against Technical
  Architecture 11.4's three open questions:
  (a) is the two-grain RLS/RBAC model present or does it need adding,
  (b) are the four mapper guards already generalised to accept an outcome
      (not just a milestone) as their target,
  (c) does a Grades 4–5 spec-equivalent exist, or only Grades 1–3.
- Adopt `/docs/specs/Data_Model_Identity_Addendum_v1.md` as the
  authoritative entity list (it supersedes Architecture 3.1 and reconciles
  the v1.0 lineage — `users`, `curriculum_areas`, `rollup_domains`,
  `prompts` — with the v3.1 band/RLS model). Every schema task below builds
  against the addendum, not against either docx alone.
- Stand up the repo skeleton from `CLAUDE.md` 4, with `CLAUDE.md`,
  `.cursor/rules/`, and `/skills/eduai-architecture/` committed on day one so
  every subsequent PR — human or agent-authored — is reviewed against the
  same invariants.
- Implement the calendar data model (Calendar spec 6) first, standalone:
  `school_calendars`, `terminals`, `calendar_closures`, the derived
  `teaching_days` view. Build and test the admin flow described in 2.2:
  enter session/terminal boundaries and weekly off-days, accept/edit the
  pre-filled national festival template, approve the generated yearly map —
  one approval configuring everything downstream.
- Build the yearly-map generator itself (`yearly_map` + `map_slices`) as a
  deterministic placement algorithm — curriculum sequence distributed across
  a terminal's teaching days, theme-led, with the terminal-close
  consolidation window as deliberate slack (Calendar spec 3). This is
  content-gated, not engineering-gated: it needs each theme/chapter's
  teaching-day weighting from trainer review before it produces a real
  School X-quality map, not a placeholder one — track this the same way
  Phase 4's Grades 4–5 outcomes-bank gate is tracked.
- This unblocks everything downstream: the assessment pack's "active this
  month" milestones/outcomes, the pacing tracker, the catch-up pack, and
  mandated reporting all read this spine and cannot be built meaningfully
  before it — per the calendar spec's own explicit sequencing note (7.1):
  specify and build the calendar model *before* those features, not
  alongside them.
- Land the CI lint rule blocking rank-order queries (Architecture 5.3)
  before any real query code exists — cheaper to enforce from row one than
  to retrofit.

**Exit criteria:** calendar schema live with a BS↔AD conversion library
confirmed; one school's full-year calendar (School X's three terminals, per
the spec's worked example) approved end-to-end and producing a real
`teaching_days` count per terminal; MVP gap list from (a)/(b)/(c) above is a
written, prioritized backlog, not an open question.

## Phase 1 — Band-as-data core + pre-primary happy path (3–5 weeks)

Goal: one real class, one real teacher, one real terminal, working end to
end on the pre-primary band, on the corrected v3.1 schema.

- Identity layer first (addendum 2): `identities` (web login = username +
  password primary; phone + OTP — WhatsApp primary, SMS fallback — as
  secondary web login, recovery, and WhatsApp-channel identity; SIM-change
  flow), `school_memberships` (identity × school × member_type),
  actor profile tables, `guardian_child_links` (join table — no
  `guardian_ids[]` array), and the "who creates whom" provisioning chain
  (platform → school admin → teachers/children; guardians self-create via
  the child-anchored WhatsApp handshake). Authorization = membership
  (tenant check first) + scoped role, never a flat role column.
- `bands`, `subjects`, `band_subjects`, `outcomes`, `grade_scales`,
  `teacher_sections` — plus `curriculum_areas` (11 Curriculum 2077 skill
  areas, the tagging system of record), `rollup_domains` +
  `area_domain_crosswalk` (the 6 parent-facing domains the year-end report
  and every parent surface read), `prompts` keyed `(feature_id, band_id)`
  seeded from `/prompts/ai-prompt-templates.md` with post-generation
  validators, and the feature × band × school flag table — the full
  configuration layer (Architecture 2.3 + addendum 3b), even though only
  the pre-primary band has content yet. This is the point where "band is
  rows, not code" either holds or doesn't — get it right here and Phases
  4–5 are additive rows, not rewrites. Crosswalk and milestone content
  stays trainer/ECE-owned — seed structure only.
- Two-grain RLS policies + the CI coverage check (Architecture 3.3, 11.3),
  layered tenant-first per the addendum.
- Safety/consent rows land with the first schema, not later: `consents`
  (per guardian-child link, grant/revoke) and `safeguarding_escalations`
  (append-only fast-path audit trail) — the safeguarding fast-path and the
  audited-consent rule both need these from day one.
- WhatsApp webhook + OTP identity, attendance (with `recorded_by`),
  milestone capture (batch sweep, carry-forward, voice/text observation)
  with all four mapper guards as automated tests.
- The derived planning cascade end to end (Calendar spec 4): monthly view
  auto-sliced from the yearly map, weekly view the teacher reviews/adjusts
  Sunday, daily lesson pre-filled from the weekly cell. Wire the AI lesson-
  plan generator (Haiku, prompt template #4 in
  `/prompts/ai-prompt-templates.md`) grounded in that day's `map_slice` and
  book position, including the 5E-vs-explicit-instruction pedagogy split and
  experience-scaled coaching notes. This is the "9:00 phonics / 9:30 lesson"
  walkthrough in System Report 3.1 — treat it as core happy path, not a
  nice-to-have alongside milestone capture.
- Syllabus coverage tracker (Calendar spec 5): `lesson_progress` writes on
  "mark done," planned-vs-actual position, pacing gap in teaching days, the
  three states (on track / behind / self-correcting). Test self-correction
  explicitly against a seeded Dashain-length closure — the map should reflow
  without a manual re-plan.
- Deterministic pre-primary documents: assessment log book, transition file.
- AI-drafted, teacher-approved monthly parent report (Sonnet) with the
  neutral-fallback path tested explicitly.
- Founding sweep + firewalled draft-import for schools joining mid-year
  (System Report 4.3) — needed before any real pilot school with prior
  records can onboard.

**Exit criteria:** a pilot class can run attendance → daily lesson (auto-
derived, never blank-page) → milestone capture → monthly report for a full
month with no manual data-fixing; the coverage tracker correctly shows
"behind" with a teaching-days-and-content-remaining readout when lessons
lag the map, and correctly self-corrects after a seeded closure; the
inclusive-assistant stall-detection path (4.4) fires correctly on a seeded
"unmoved milestone" test case. Confirm explicitly that coverage
("lesson_progress = done") and learning ("student_outcomes") never get
merged into one status anywhere in the UI or a query.

## Phase 2 — Pre-primary compliance + school/parent layers (2–4 weeks)

Goal: what makes a school trust this enough to stay, and what the law
actually requires end to end.

- Year-end developmental report (the six-domain view reads `rollup_domains`
  via the area→domain crosswalk — never a mapping hardcoded in report code),
  inspection pack export.
- Admin dashboard at the gravity-rule altitude (coverage, not distributions)
  — plus the admin's *pacing* altitude specifically: sections-behind
  visibility across a grade (Calendar spec 5.1), sourced from the same
  `lesson_progress`/`map_slices` tables the teacher uses, never a separate
  compliance-tracking system. This is practice-level like everything else on
  the admin dashboard — never a cross-teacher pacing league table.
- The calendar-dependent MANAGE-module features that ride the same spine
  built in Phase 1 (Calendar spec 7): first-month settling programme
  (Baisakh scramble), substitute pack (day pack + attendance + day note only
  — rating/confirmation explicitly disabled, per Architecture 5.2's
  substitute role, with access granted as an expiring `substitute_access`
  row, not a UI convention), catch-up pack (query over `lesson_progress` against a
  child's attendance record — build this as a query, not a new content
  pipeline), and the festival/event planner reading `calendar_closures`
  directly so rehearsals inject into the weekly view automatically.
- Two-way messaging, PTM prep, broadcast channel.
- Handover pack (materialized snapshot, coach-chat structurally excluded).
- Exit/retention mechanics: full export, leaving packs, deletion window.

**Exit criteria:** a full Curriculum-2077 compliance cycle (assessment log →
year-end report → transition file → inspection pack) is producible on demand
for a pilot section, with every document traced back to the deterministic-
vs-AI-drafted split in Architecture 6.1.

## Phase 3 — Grades 1–3 extension (4–6 weeks)

Goal: the v3.1 correction (subject-teacher rotation + class-teacher oversight
from Grade 1) actually implemented, not just modeled.

- `teacher_sections(subject_id)` populated for real subject rotation; verify
  RLS collapses correctly to the pre-primary case with zero special-casing.
- Four-level CDC scale, `grade_scales` (E–A+), deterministic aggregation
  engine (4.3).
- Two-pass record (`attempt` ENUM) and the full remedial-ladder state
  machine (4.2), including the job-engine reminder/escalation workflows.
- Annex 2/3/4 deterministic rendering — reuse and extend the doc-render
  service built in Phase 1/2, not a parallel pipeline. Confirm the
  fonts-noto-core and landscape-orientation fixes are in place before this
  phase's first real render.
- Assessment methods toolkit as a generation-menu config (4.6).

**Exit criteria:** a Grade 1–3 pilot section can run a full remedial loop
(rating → below-basic → activity generated → re-assessed → closed or
escalated) with the admin's open-loop count visible and accurate.

## Phase 4 — Grades 4–5 extension (3–5 weeks, gated on content)

Goal: extend the same engine, not build a second one — and this phase is
explicitly gated on the outcomes-bank dependency called out as unresolved.

- Confirm/complete the Grades 4–5 outcomes bank (trainer/specialist
  dependency — do not synthesize this content in code).
- New `bands` row (`basic_upper`), `grade_scales` row (NG–A+), subject list
  — per the worked "add a band without a deploy" example (Architecture
  2.4). If this requires any code change beyond rows and content, that's a
  regression against the Phase 1 foundation — fix the foundation, not this
  phase.
- Cross-domain contamination guard verified at both layers (outcome-
  authoring text + RLS) specifically for subject teachers seeing a child
  only a few periods a week.

**Exit criteria:** the same remedial-ladder and Annex pipeline built in
Phase 3 runs unmodified for a Grade 4–5 pilot section, driven only by the
new configuration rows.

## Phase 5 — Cost, caching, and career layer (2–3 weeks)

- Tune the remedial-activity cache (expected highest hit rate in the
  system) and validate the 3–4%-of-revenue infrastructure target against
  real pilot usage, per Architecture 12.3, before finalizing Grades 4–5
  pricing.
- Certification (12-week credential), community/moments library.
- Out-of-segment query log wired from first deployment if not already
  (Architecture 2.2/13.2) — it's a demand signal for a future Grade 6–8
  extension and is cheap to add early, expensive to reconstruct
  retroactively.

## Phase 6 — Pilot hardening, security review, launch prep

- Staging environment exercising all three band configurations
  simultaneously (Architecture 11.1) before any production cutover.
- Security review against 10 (RLS coverage, rank-order block, audit
  logging on elevated actions, consent-gate enforcement).
- Resolve remaining open items before any external commitment: 138-milestone
  bank sign-off, Nepali/code-switched voice transcription go/no-go,
  BS↔AD library, and the working-name replacement across every parent- and
  school-facing artifact.

---

## Sequencing notes / things not to parallelize carelessly

- Don't start Phase 3's RLS work before Phase 1's two-grain model and CI
  lint are solid — the Grade 1–3 extension is where the two-grain design
  either pays off or reveals it wasn't real in Phase 1.
- Don't build a second document-rendering pipeline for Annex 2/3/4 — extend
  the Phase 1/2 service; the whole cost case in Architecture 12 depends on
  one deterministic engine, not two.
- Grades 4–5 (Phase 4) is explicitly content-gated, not engineering-gated —
  don't let engineering work get ahead of the outcomes-bank dependency, per
  Architecture 13.2's own flag on this.
- Don't start the pacing tracker, catch-up pack, or assessment pack's
  monthly slice before the calendar model (Phase 0) is stable — the
  Calendar spec is explicit that this is a strict prerequisite, not
  parallelizable work (7.1). The yearly-map generator is itself gated on
  trainer-sourced teaching-day weighting the same way Grades 4–5 is gated on
  the outcomes bank — don't ship a guessed-weighting map to a real school.
- Keep the deterministic/generative split clean: yearly-map placement,
  teaching-day computation, and the pacing gap are arithmetic over rows
  (zero AI cost); only the daily lesson content itself (prompt template #4)
  and lesson rescue are generative. Don't let "the planner generated today's
  plan" blur into thinking placement is AI-driven too.
