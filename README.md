# EduAI Nepal (working name)

WhatsApp-first education platform for Nursery–Grade 5 in Nepali private schools.
Pre-primary banded milestones, Grades 1–5 CDC outcomes, calendar-driven pacing,
and compliance documents rendered from live data.

## Start here

| Document | Purpose |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Compressed invariants, stack, repo layout, working conventions |
| [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) | Phased build plan (Phase 0 → launch) |
| [`docs/specs/Data_Model_Identity_Addendum_v1.md`](./docs/specs/Data_Model_Identity_Addendum_v1.md) | Authoritative entity list + identity/auth model (supersedes Architecture §3.1) |

## Source specs (`docs/specs/`)

- `EduAI_Full_System_Report.docx` — product, pedagogy, legal grounding
- `EduAI_Technical_System_Architecture_v3_1.docx` — engineering architecture
- `Calendar_Curriculum_Pacing_Spec_v1.docx` — calendar and pacing model

## Repo layout (target)

```
apps/api      NestJS core API
apps/web      SvelteKit web companion + parent portal
apps/docgen   Deterministic document rendering
apps/jobs     Inngest / Trigger.dev workflows
packages/db   Supabase schema, migrations, RLS
packages/ai   Prompt lookup and output validators
```

Monorepo: `pnpm-workspace.yaml`. Agent rules: `.cursor/rules/` and `skills/eduai-architecture/SKILL.md`.

## Development

```bash
pnpm install
pnpm build          # build all packages
pnpm dev            # run all apps in parallel (watch mode)

# Individual apps
pnpm --filter @eduai/api dev      # http://localhost:3000/health
pnpm --filter @eduai/web dev      # http://localhost:5173, /health
pnpm --filter @eduai/docgen dev   # http://localhost:3002/health
pnpm --filter @eduai/jobs dev     # http://localhost:3003/health
```

Copy `.env.example` to `.env` before local configuration (Step 2: Supabase).

## Auth (school-side actors)

- **Web (primary):** username + password → `identities`
- **Web (secondary):** phone + OTP (WhatsApp primary, SMS fallback)
- **WhatsApp channel:** inbound messages identified by verified phone (same identity row)

Authorization: `school_memberships` (tenant) → scoped role (`teacher_sections`, guardian links, admin membership). The child is never a login user.
