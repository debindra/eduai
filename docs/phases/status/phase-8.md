# Phase 8 — Status

Updated: 2026-07-19

**Exit criteria:** platform can maintain the global ECA/CCA catalog with
icons; school admin can enable catalog items or add school-only items and
place them on the calendar with icons; ECA/CCA remain non-teaching-day
markers.

| Criterion | Met? |
|---|---|
| Platform global catalog CRUD + icons | [x] |
| School enable catalog / school-only CRUD | [x] |
| Calendar placement with activity link + icons | [x] |
| ECA/CCA still ignore `teaching_days` | [x] |

**Next:** Optional polish (regenerate OpenAPI types for `schoolActivityId`,
platform tenant calendar activity picker). Phase 6 (pilot hardening)
remains a separate open track.

---

## Task status

| ID | Status | Evidence | Updated |
|---|---|---|---|
| P8-DB-01 | done | `20250718290000_eca_cca_catalog.sql` | 2026-07-19 |
| P8-DB-02 | done | `school_eca_cca_items` in same migration | 2026-07-19 |
| P8-DB-03 | done | `calendar_closures.school_activity_id` + CHECKs | 2026-07-19 |
| P8-DB-04 | done | seed catalog (12) + School X items (4); verify-seed | 2026-07-19 |
| P8-API-CAT-01 | done | `EcaCcaCatalogController` + `EcaCcaService` | 2026-07-19 |
| P8-API-SCH-01 | done | `EcaCcaController` under `schools/:schoolId/eca-cca` | 2026-07-19 |
| P8-API-CAL-01 | done | `FestivalClosureDto.schoolActivityId` + calendar service | 2026-07-19 |
| P8-WEB-PLAT-01 | done | `/platform/eca-cca` + `PlatformNav` | 2026-07-19 |
| P8-WEB-ADM-01 | done | `AdminManagePage` ECA/CCA section | 2026-07-19 |
| P8-WEB-CAL-01 | done | Closure dialog picker + marker `iconKey` | 2026-07-19 |
| P8-TEST-01 | done | `eca-cca.service.spec.ts` | 2026-07-19 |
| P8-TEST-02 | done | calendar.service activity link + teaching-days ECA/CCA | 2026-07-19 |
| P8-TEST-03 | done | `eca-cca-logic.spec.ts` + markers icon prefix | 2026-07-19 |

## Blockers

- None. Seed `map_slices` / `teaching_days` count-0 after reset is a
  pre-existing fixture issue unrelated to ECA/CCA tables (catalog verify OK).
