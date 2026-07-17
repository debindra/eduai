# @eduai/db — Supabase schema and clients

PostgreSQL migrations and Supabase config for EduAI Nepal.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- Supabase CLI (installed via this package's devDependency)

## Local stack

From repo root:

```bash
pnpm install
pnpm db:start      # first run downloads images; may take a few minutes
pnpm db:reset      # apply migrations + seed
pnpm db:status     # copy URL/keys into .env
```

Or from this directory: `pnpm db:start`, `pnpm db:reset`.

After `supabase status`, set in the repo-root `.env`:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<anon key from status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from status>
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<same anon key>
```

## Migrations

| Migration | Contents |
|---|---|
| `20250717123000_identity_tenant.sql` | `identities`, `schools`, `school_memberships`, actor profiles, `guardian_child_links`, `substitute_access`, baseline RLS |

Seed creates **School X (dev)** and one UKG section only. Admin/teacher identities are provisioned via the API (Step 2+ auth endpoints).

## Generate types

```bash
pnpm db:types
```

Writes `src/types/database.generated.ts` from the local schema.
