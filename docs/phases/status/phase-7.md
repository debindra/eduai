# Phase 7 — Status

Updated: 2026-07-19

**Exit criteria:** platform super admin can list all schools (aggregates
only), open an audited support session for school drill-down, maintain a
published national calendar that auto-applies into `teaching_days`, and
use a shared hamropatro-style BS-primary calendar (monthly + 12-month
overview) in platform and school-admin UIs.

| Criterion | Met? |
|---|---|
| Cross-tenant list + gravity-safe aggregates | [x] |
| Audited support-session drill-down | [x] |
| National calendar → auto-apply → `teaching_days` | [x] |
| BS-primary calendar UI (month + 12-month) | [x] |

**Next:** Optional deferred tickets (P7-API-PLAT-04 provisioning, band/AI/
licensing UIs, audit console). National-festival yearly-refresh owner remains
an open product item (`CLAUDE.md` §7).

---

## Task status

| ID | Status | Evidence | Updated |
|---|---|---|---|
| P7-DB-01 | done | `20250718220000_platform_admins.sql` | 2026-07-19 |
| P7-DB-02 | done | `20250718230000_support_sessions.sql` | 2026-07-19 |
| P7-DB-03 | done | `20250718240000_national_calendar.sql` | 2026-07-19 |
| P7-DB-04 | done | `20250718250000_teaching_days_national_closures.sql` | 2026-07-19 |
| P7-DB-05 | done | seed + `seed-dev-auth` + `verify-seed` green | 2026-07-19 |
| P7-API-PLAT-01 | done | login `super_admin`, `RequirePlatformAdminGuard` | 2026-07-19 |
| P7-API-PLAT-02 | done | `GET /platform/schools` + gravity interceptor | 2026-07-19 |
| P7-API-PLAT-03 | done | support-sessions API + school-admin drill-down audit | 2026-07-19 |
| P7-API-CAL-NAT-01 | done | `NationalCalendarModule` CRUD + publish | 2026-07-19 |
| P7-API-CAL-02 | done | setupCalendar uses national; no hardcoded template | 2026-07-19 |
| P7-API-BS-01 | done | `@eduai/bs-date` wraps `nepali-datetime` | 2026-07-19 |
| P7-WEB-BS-01 | done | `NepaliCalendar` month + 12-month + tests | 2026-07-19 |
| P7-WEB-CAL-01 | done | CalendarWizard rebuilt on NepaliDatePicker | 2026-07-19 |
| P7-WEB-PLAT-01 | done | `/platform/*` routes + feature folder | 2026-07-19 |
| P7-WEB-PLAT-02 | done | login redirect + `PlatformNav` | 2026-07-19 |
| P7-TEST-01 | done | platform/support-session guard + gravity specs | 2026-07-19 |
| P7-TEST-02 | done | `teaching-days-national-reflow.spec.ts` | 2026-07-19 |
| P7-TEST-03 | done | `@eduai/bs-date` boundary + round-trip specs | 2026-07-19 |

## Blockers

- National festival template yearly-refresh owner (`CLAUDE.md` §7) — data rows only; not hardcoded.
- BS↔AD library confirmed as `nepali-datetime` (wrapped by `@eduai/bs-date`).
