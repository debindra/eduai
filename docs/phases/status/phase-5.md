# Phase 5 — Status

Updated: 2026-07-18

**Exit criteria:** infrastructure cost validated against real pilot usage
before Grades 4–5 pricing is finalized. Engineering slice complete; the
cost-validation exit itself waits on real pilot traffic.

| ID | Status | Evidence | Updated |
|---|---|---|---|
| P5-API-01 | done | `ai-orchestration` `CachePort` + `InMemoryCacheAdapter` + `CacheMetricsService`; content-only key (`cache-key.ts`); `GET /admin/cache-metrics` (remedial cache separate) | 2026-07-18 |
| P5-API-CERT-01 | done | `modules/certification` state machine + deterministic quiz scoring + role-gated observation; `certification_progress`/`certification_observations` in `20250718210000_phase5_cost_career.sql` | 2026-07-18 |
| P5-API-02 | done | `modules/out-of-segment` + `isBandLicensed`; hooked at orchestration choke point; `out_of_segment_query_log`; `GET /admin/out-of-segment` (counts only) | 2026-07-18 |
| P5-WEB-01 | done | `features/community` `CommunityPage.svelte` (no child data) + `CommunityModule` `GET /community/moments`; route + TeacherNav | 2026-07-18 |
| P5-WEB-02 | done | `features/certification` `CertificationPage.svelte` + `api.ts`; route + TeacherNav | 2026-07-18 |

**Tests:** `pnpm --filter @eduai/api test` 187 passed; `pnpm --filter @eduai/web test`
97 passed. API typecheck + web lint clean.

**Cache/PII hardening (review fix):** cacheable AI features (`methods_toolkit`,
`catch_up_reteach`) are now child-agnostic — `child_name` removed from both the
orchestration inputs and the seeded prompt templates so no child first-name can
be baked into shared (content-keyed) cache output. Regression tests assert the
identity var is never passed; a defence-in-depth key test proves stray vars can
never split/leak the key. Added a controller test that the observation self-score
route denies teachers (assessor/admin only) using live route metadata.

**Adapter convention:** cache/metrics/WhatsApp delivery follow the repo's
console/in-memory stub pattern — real Upstash Redis, Axiom/Sentry sink, and
Meta WhatsApp delivery remain operator steps.

**Flagged decisions:**
- `schools.licensed_band_range` treated as a comma-separated set of band codes
  (hierarchy `pre_primary < basic_early < basic_upper` exported for future
  range semantics).
- Community/moments scoped to teacher-authored shareable moments only — no
  child records — to hold the no-child-data-leakage + gravity invariants.

**Pre-existing (out of scope):** `apps/web` `tsc --noEmit` reports 3 errors in
`features/calendar/CalendarWizard.spec.ts` (untouched by Phase 5); `basic_early`
band is seeded via migration but referenced widely — both flagged, not changed.
