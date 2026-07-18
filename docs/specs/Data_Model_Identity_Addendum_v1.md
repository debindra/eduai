# Data Model & Identity Addendum v1

**Status:** supersedes and completes 3.1 ("Entity relationship summary") of
`EduAI_Technical_System_Architecture_v3_1.docx`. That section ends with a
dangling "Missing entities" placeholder — this document fills it. The docx
itself is kept as read-only reference; where the two disagree, this addendum
wins for the entity list, and the docx remains authoritative for everything
else (3.2 exclusions, 4 workflows, 5 RBAC narrative, etc.).

**Why it exists:** two architecture generations drifted apart. The older
`System_Architecture_v1.0` / System Report v3.2 lineage had `users`,
`curriculum_areas`, `rollup_domains`, `levels`, and a `prompts` table;
v3.1 dropped or collapsed several of these while adding the band/RLS model.
This addendum reconciles both into one list.

---

## 1. Lineage reconciliation (v1.0 → current)

| v1.0 table | Current resolution |
|---|---|
| `users` (phone, role, school_id) | **Replaced** by `identities` (Supabase Auth link) + `school_memberships`. No flat role enum on teachers; authorization comes from membership + scoped role. |
| `students` | `child` (never a login identity) |
| `levels` | Absorbed into `section.grade` + `bands`; a level is still data, not code |
| `curriculum_areas` | **Restored** — kept as a first-class table (3) |
| `rollup_domains` | **Restored** — kept, with an area→domain crosswalk (3) |
| `milestones / outcomes` | `outcomes` (framework enum generalises the milestone bank) |
| `student_milestones` | `student_outcomes` (attempt ENUM two-pass model) |
| `prompts` | **Kept** — first-class table, keyed `(feature_id, band_id)` (3) |
| `logs` | Split: `audit_log`, `out_of_segment_query_log`, per-ID delivery logs on `message_log` |

## 2. Identity & authentication model

**Credentials live in Supabase Auth (`auth.users`).** App Postgres holds a
thin `identities` row that links via `auth_user_id` — no `password_hash`
column. Full invite/recovery flows: `ARCHITECTURE.md` Part 1,
"Authentication."

- **Web app (primary):** username (email or mobile) + password via
  Supabase Auth. Admin and Teacher only. Mobile-only accounts use an
  internal synthetic email mapping (never stored in `identities.email`).
- **Phone + OTP:** WhatsApp OTP primary, SMS OTP fallback — **recovery and
  2FA only for web**, never a web sign-in path. WhatsApp channel identity
  still uses the verified phone on the same `identities` row (SIM-change
  has a handled re-binding flow).
- **Guardians:** WhatsApp handshake only in this phase — no web password /
  invite path. Parent portal access remains an open product item
  (`CLAUDE.md` 7); do not invent a guardian login here.

A teacher who uses WhatsApp and the web resolves to the same `identities`
row, so a milestone set on WhatsApp still shows as already-filled on the
web. The child is never a user — no account, no login, no screen.

- **`identities`** — global login identity: `id`, `auth_user_id` (→
  `auth.users`, NULL until invite accepted), `email` (real only, nullable),
  `phone` (unique, verified for OTP/WhatsApp), `account_status`
  (`invited` | `active` | `disabled`), invite token fields for mobile-only
  invites, timestamps. Auth link only; carries zero pedagogy fields.
- **`schools`** — the tenant boundary (unchanged from v3.1 `school`).
- **`school_memberships`** — `identity_id`, `school_id`, `member_type`
  (`teacher | admin | guardian | trainer_viewer`), `status`, timestamps.
  Unique per `(identity_id, school_id, member_type)`. One person may hold
  multiple memberships (e.g. admin who also teaches; a teacher who moves
  schools gets a new membership, history stays with the old one). Admin
  gate for admin-only endpoints is `member_type = 'admin'`.
- **Profile tables per actor type** — `teacher` (profile,
  `certification_status`, `adaptation_signal` internal-only), `guardian`
  (relationship, `language_pref`), admin profile (`school_admins`). Each
  1—1 with its membership.
- **Authorization rule:** never authorize from a role column on `teachers`
  alone. The chain is identity → membership (tenant check first) → scoped
  role: `teacher_sections` for teachers, `guardian_child_links` for
  guardians, `member_type` for admins. RLS policies evaluate tenant
  isolation before section/subject grain, always.
- **Who creates whom** (unchanged product rule): platform team creates
  schools (one admin each); the admin creates teachers and child profiles;
  guardians self-create via the WhatsApp handshake, always anchored to a
  child; standalone parent accounts do not exist.

## 3. Revised entity relationship summary

Grouped by layer, in RLS evaluation order. Fields are illustrative, as in
the original 3.1.

### 3a. Identity & tenant

| Entity | Key fields | Relationships / notes |
|---|---|---|
| `identities` | id, auth_user_id (→ auth.users), email (real, nullable), phone (unique, verified), account_status, invite fields | 1—N `school_memberships`. Passwords in Supabase Auth only. Web login = email/mobile + password; phone OTP = recovery/2FA/WhatsApp channel only. |
| `schools` | id, name, region, tier, licensed_band_range, exit_status | Tenant boundary for all RLS. 1—N sections, memberships. |
| `school_memberships` | id, identity_id, school_id, member_type, status | The tenant join. 1—1 actor profile by type. |
| `teacher` | id, membership_id, profile, certification_status, adaptation_signal (internal only) | 1—N `teacher_sections`; 1—N `certification_progress`. |
| `teacher_sections` | id, teacher_id, section_id, subject_id (NULL at pre-primary), is_class_teacher | The RBAC backbone, unchanged from v3.1. |
| `guardian` | id, membership_id, relationship, language_pref | N—M child via `guardian_child_links`; self-created via handshake only. |
| `guardian_child_links` | id, guardian_id, child_id, relationship, linked_at | Replaces `child.guardian_ids[]` (removed — an array column duplicates and drifts from this join). Up to three guardians per child. |
| `substitute_access` | id, section_id, identity_id, granted_by, starts_at, expires_at | Makes "substitute access expires automatically" a row, not application folklore. Rating/confirmation disabled at RLS for this role. |

### 3b. Configuration (band-as-data + calendar)

| Entity | Key fields | Relationships / notes |
|---|---|---|
| `bands` / `subjects` / `band_subjects` / `outcomes` / `grade_scales` | see Architecture 2.3 | Unchanged. |
| `curriculum_areas` | id, band_id, code, name_np, name_en | The 11 Curriculum 2077 skill areas at pre-primary; CDC subject/areas from Grade 1. System of record for outcome tagging and the cross-domain guard. |
| `rollup_domains` | id, code, name_np, name_en | The 6 parent-facing domains. Teachers/admins may see all 11 areas; parents and principals see the 6 domains. |
| `area_domain_crosswalk` | area_id, domain_id | The 11→6 rollup used by the year-end developmental report and every parent surface. Content is trainer/ECE-owned — seed structure only, never synthesize rows in code. |
| `prompts` | id, feature_id, band_id, template, constraints_ref, version | Runtime source of truth for every AI prompt; `/prompts/ai-prompt-templates.md` is the human-readable seed. A new band's prompt is a new row, not a deploy. |
| `feature_flags` | feature_id, band_id, school_id, enabled | The feature × band × school join from 2.2. |
| `section` | id, school_id, band_id, grade, name | Unchanged. |
| Calendar block: `school_calendars`, `terminals`, `calendar_closures`, `yearly_map`, `map_slices` | see Calendar spec 6 | Same migration history as everything above; `teaching_days` is a derived view, never stored. Terminal = coverage/reporting boundary, never an exam. |

### 3c. Pedagogy spine

| Entity | Key fields | Relationships / notes |
|---|---|---|
| `child` | id, section_id, name, roll_number, dob, status (active/promoted/transferred/exited), report_language_override, access_note | **Changed:** `guardian_ids[]` removed (see `guardian_child_links`); `dob`, `status`, `report_language_override` added. Never a login identity. No personality/trait/risk fields, ever. |
| `student_outcomes` | id, child_id, outcome_id, value, attempt ENUM('regular','after_support'), date, source, method_tag, evidence_link, confirmed_by, confirmed_at | Unchanged. Only an explicit teacher confirmation writes here. |
| `remedial_plans` | id, student_outcome_id, stage, status, activity_ref, reminder_job_id, re_assessment_outcome_id, escalation_reason | Unchanged. |
| `portfolio_items` | id, child_id, band_span, item_type, storage_ref, added_by, added_at | Unchanged. |
| `attendance_record` | id, child_id, date, status, recorded_by | **Changed:** `recorded_by` added — attendance is the class teacher's duty and the substitute's only write; provenance matters. |
| `lesson_progress` | section_id, subject_id, map_slice_id, status, marked_at | From Calendar spec 6 — replaces the vague `lesson_plan / weekly_map / period_plan` row; the derived planning cascade reads `map_slices`, and "done" means "I taught this," never "they learned this." |
| `certification_progress` | id, teacher_id, week, status | Was referenced in v3.1 3.1 but never defined; now first-class. |

### 3d. Communication & documents

| Entity | Key fields | Relationships / notes |
|---|---|---|
| `family_threads` | id, school_id, phone, child_ids[] resolved via links | One number can serve multiple siblings — thread↔child is not 1—1. |
| `message_log` | id, thread_id, direction, channel, intent_route, content_ref, approval_status | Subject-routed from Grade 1; per-ID delivery logs make every send auditable. |
| `document_render` | id, template_type, child_id or section_id, generated_at, source_row_hash, storage_ref | Unchanged; `source_row_hash` detects staleness. |

### 3e. Operations, safety & audit

| Entity | Key fields | Relationships / notes |
|---|---|---|
| `consents` | id, guardian_child_link_id, consent_type, granted_at, revoked_at | Guardians "give or withhold every consent" — now a row. Platform per-child access requires an audited session referencing a live consent. |
| `safeguarding_escalations` | id, source_ref, detected_at, routed_to (class teacher + principal), reviewed_by, reviewed_at, resolution | Append-only. The fast-path (Architecture 10.3) bypasses every queue; this is its audit trail, separate from the trainer-review log. No volume cap. |
| `handover_pack` | id, section_id, departing_teacher_id, incoming_teacher_id, snapshot | Unchanged; materialized snapshot, coach-chat structurally excluded. |
| `inclusive_assistant_log` | id, outcome_id (anonymised child ref), stall_window or remedial_stage, action_taken, escalation_flag | Unchanged. |
| `audit_log` | id, actor_identity_id, action, scope, timestamp, justification_ref | **Changed:** actor now references `identities`, so admin/trainer/platform actions have a real referent. Append-only. |
| `out_of_segment_query_log` | id, school_id, requested_feature, requested_band, at | From 2.2 — the Phase-2 demand signal; wired from first deployment. |

## 4. What this addendum deliberately does NOT change

Every 3.2 exclusion stands: no personality/trait/risk-category fields on
`child`; no numeric score at pre-primary; no rank-order query path; no
teacher competence score. No exam/test-date entity anywhere. The new
entities above (consents, safeguarding_escalations, substitute_access) exist
to make those exclusions *enforceable*, not to weaken them.
