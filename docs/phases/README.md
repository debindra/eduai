# Phase tasks & status

Living detail for the checklist in [`PHASE_TASKS.md`](../../PHASE_TASKS.md).
Narrative roadmap: [`PROJECT_PLAN.md`](../../PROJECT_PLAN.md).

| Path | Role |
|---|---|
| [`tasks/`](tasks/) | Spec — what to build (ticket IDs, acceptance criteria, refs) |
| [`status/`](status/) | Progress — `todo` / `in_progress` / `done` / `blocked` per ID |
| [`status/SUMMARY.md`](status/SUMMARY.md) | One-page board across all phases |

## Sync rules

1. **New tickets** land in root `PHASE_TASKS.md` first (compact checkbox).
2. Expand into `tasks/phase-N-*.md` with a stable ID (`P0-DB-01`, …).
3. **Status only changes** in `status/phase-N.md` (and `SUMMARY.md` counts).
4. Do not duplicate architecture specs here — link to `ARCHITECTURE.md`,
   `docs/specs/`, and `.cursor/rules/`.

## Phases

| Phase | Tasks | Status |
|---|---|---|
| 0 — Foundations | [phase-0-foundations.md](tasks/phase-0-foundations.md) | [phase-0.md](status/phase-0.md) |
| 1 — Band-as-data + pre-primary | [phase-1-band-as-data.md](tasks/phase-1-band-as-data.md) | [phase-1.md](status/phase-1.md) |
| 2 — Compliance + school/parent | [phase-2-compliance.md](tasks/phase-2-compliance.md) | [phase-2.md](status/phase-2.md) |
| 3 — Grades 1–3 | [phase-3-grades-1-3.md](tasks/phase-3-grades-1-3.md) | [phase-3.md](status/phase-3.md) |
| 4 — Grades 4–5 (content-gated) | [phase-4-grades-4-5.md](tasks/phase-4-grades-4-5.md) | [phase-4.md](status/phase-4.md) |
| 5 — Cost / career | [phase-5-cost-career.md](tasks/phase-5-cost-career.md) | [phase-5.md](status/phase-5.md) |
| 6 — Pilot / launch | [phase-6-pilot-launch.md](tasks/phase-6-pilot-launch.md) | [phase-6.md](status/phase-6.md) |

## Status values

`todo` | `in_progress` | `done` | `blocked`

When marking `done`, record **Evidence** (migration path, PR, or file).
