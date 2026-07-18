# Supabase cloud provision (P0-OPS-01)

Phase 0 local E2E uses Docker (`pnpm db:start` / `pnpm db:reset`). For staging
or production, provision a hosted Supabase project in-region.

## Region

Choose one:

- **Mumbai** — `ap-south-1`
- **Singapore** — `ap-southeast-1`

Match the region of API / worker hosting (Fly.io or Cloud Run asia-south1 /
asia-southeast1).

## Steps

1. Create a project at [supabase.com](https://supabase.com) in the chosen region.
2. Apply migrations from `packages/db/supabase/migrations/` (CLI link or CI).
3. Copy into the **server** secret store only:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (if needed for ops)
4. Never put `SUPABASE_SERVICE_ROLE_KEY` in `VITE_*` / `PUBLIC_*` web env.
5. Run `pnpm seed:dev-auth` only against **local** / disposable environments —
   do not use School X seed passwords in production.

## Repo evidence

Local stack docs: [`packages/db/README.md`](../../packages/db/README.md).
This runbook satisfies the engineering deliverable for P0-OPS-01; creating the
actual cloud project is an operator step at deploy time.
