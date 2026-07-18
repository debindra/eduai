# Phase 0 — Status

Updated: 2026-07-18

**Exit criteria**

| Criterion | Met? |
|---|---|
| Calendar enter → festival → approve E2E | [ ] manual wizard smoke recommended |
| `teaching_days` real per-terminal count | [x] VIEW + seed (299 days / 3 terminals) + API |
| CI blocks broken RLS + rank-order query | [x] `scripts/ci/check-*.mjs` + `.github/workflows/ci.yml` |
| Admin invite → login works | [x] `pnpm seed:dev-auth` → `admin@schoolx.dev` / `DevPassword123!` |

**Next:** Optional calendar wizard UI smoke; operator creates cloud Supabase when deploying.

---

## Task status

| ID | Status | Evidence | Updated |
|---|---|---|---|
| P0-DB-01 | done | `20250718120000_identity_tenant_auth.sql` | 2026-07-18 |
| P0-DB-02 | done | same migration | 2026-07-18 |
| P0-DB-03 | done | `20250718140000_calendar_spine.sql` | 2026-07-18 |
| P0-DB-04 | done | `teaching_days` VIEW in calendar migration | 2026-07-18 |
| P0-DB-05 | done | `20250718130000_bands_config.sql` + pre_primary seed | 2026-07-18 |
| P0-DB-06 | done | `20250718150000_rbac_pedagogy_audit.sql` | 2026-07-18 |
| P0-DB-07 | done | `yearly_map` / `map_slices` / `lesson_progress` tables | 2026-07-18 |
| P0-DB-08 | done | `student_outcomes`, `attendance_record` | 2026-07-18 |
| P0-DB-09 | done | two-grain policies + helpers in rbac migration | 2026-07-18 |
| P0-DB-10 | done | `audit_log` (no authenticated SELECT) | 2026-07-18 |
| P0-SEED-01 | done | `packages/db/supabase/seed.sql` calendar draft + closures | 2026-07-18 |
| P0-SEED-02 | done | 3 children + guardians + links in seed.sql | 2026-07-18 |
| P0-SEED-03 | done | admin/teacher identities + teacher_sections | 2026-07-18 |
| P0-SEED-04 | done | `scripts/seed-dev-auth.mjs` + `pnpm seed:dev-auth` | 2026-07-18 |
| P0-SEED-05 | done | attendance + proposed student_outcomes | 2026-07-18 |
| P0-SEED-06 | done | draft yearly_map stub | 2026-07-18 |
| P0-SEED-07 | done | expired + future substitute_access | 2026-07-18 |
| P0-SEED-08 | done | `scripts/verify-seed.mjs` + `pnpm verify:seed` | 2026-07-18 |
| P0-API-SWAGGER-01 | done | `apps/api/src/main.ts` `/api/docs` + `/api/docs-json` | 2026-07-18 |
| P0-API-AUTH-01 | done | `modules/auth/adapters/supabase-auth.adapter.ts` | 2026-07-18 |
| P0-API-AUTH-02 | done | `auth.service.ts` + unit tests | 2026-07-18 |
| P0-API-AUTH-03 | done | `POST /auth/login` | 2026-07-18 |
| P0-API-AUTH-04 | done | invite + accept-invite endpoints | 2026-07-18 |
| P0-API-AUTH-05 | done | recovery OTP endpoints (console stub) | 2026-07-18 |
| P0-API-AUTH-06 | done | `SupabaseAuthGuard` | 2026-07-18 |
| P0-API-AUTH-07 | done | `RequireRole('admin')` | 2026-07-18 |
| P0-API-RBAC-01 | done | `modules/rbac/guards/*` + decorator | 2026-07-18 |
| P0-API-RBAC-02 | done | `AdminGravityRuleInterceptor` | 2026-07-18 |
| P0-API-CAL-01 | done | `modules/calendar/*` fully Swagger-decorated | 2026-07-18 |
| P0-API-BAND-01 | done | `modules/band-config/*` + SQL seed | 2026-07-18 |
| P0-API-CI-01 | done | `scripts/ci/check-rank-order.mjs` | 2026-07-18 |
| P0-API-CI-02 | done | `scripts/ci/check-rls-coverage.mjs` + `tests/rls_coverage.sql` | 2026-07-18 |
| P0-WEB-01 | done | `apps/web` Svelte 5 + Vite + Tailwind | 2026-07-18 |
| P0-WEB-02 | done | `generate:api-types` script + stub types | 2026-07-18 |
| P0-WEB-03 | done | `@keenmate/svelte-spa-router` + session store | 2026-07-18 |
| P0-WEB-04 | done | `features/calendar/CalendarWizard.svelte` | 2026-07-18 |
| P0-WEB-05 | done | Login + Recovery pages | 2026-07-18 |
| P0-OPS-01 | done | Runbook [`docs/ops/supabase-cloud-provision.md`](../../ops/supabase-cloud-provision.md); cloud project is operator step at deploy | 2026-07-18 |
| P0-OPS-02 | done | `.github/workflows/ci.yml` | 2026-07-18 |
| P0-OPS-03 | done | `.env.example` cleaned (no JWT/BCRYPT) | 2026-07-18 |

## Blockers

None for Phase 0 tickets. Optional: click-through calendar wizard against local stack.
