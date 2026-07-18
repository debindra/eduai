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

After `supabase status`, set in the repo-root `.env` (see `.env.example` for the full list):

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<Publishable key from status>
SUPABASE_SERVICE_ROLE_KEY=<Secret key from status>
DATABASE_URL=<Database URL from status>
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<same Publishable key>
```

## Migrations

| Migration | Contents |
|---|---|
| `20250718120000_identity_tenant_auth.sql` | `identities` (Supabase Auth link via `auth_user_id`, invite state — no app passwords), `schools`, `school_memberships`, actor profiles, `guardian_child_links`, `substitute_access`, `current_identity_id()` / `current_teacher_id()`, baseline RLS |

**Auth model:** Admin + Teacher web login is username (email or mobile) + password via Supabase Auth. Phone OTP is recovery/2FA and WhatsApp-channel identity only. Guardians are WhatsApp-only (no web invite path in this phase).

Seed creates the full School X fixture (calendar draft, children, invited
admin/teacher, pedagogy samples). See `supabase/seed.sql`.

After reset, activate web login (passwords in Supabase Auth only):

```bash
pnpm db:status   # ensure .env has SUPABASE_* keys
pnpm seed:dev-auth
pnpm verify:seed
# Optional: VERIFY_SEED_REQUIRE_AUTH=1 pnpm verify:seed
```

Dev credentials (local only): `admin@schoolx.dev` / `DevPassword123!`
(and `teacher@schoolx.dev` with the same password). Override with
`SEED_DEV_PASSWORD`.

## RLS coverage checks

| Artifact | Role |
|---|---|
| `supabase/tests/rls_coverage.sql` | Live introspection: listed pedagogy tables must have ≥1 policy |
| `pnpm check:rls-coverage` (repo root) | CI: asserts `CREATE POLICY` exists in migrations for critical tables; when `DATABASE_URL` is set, also runs `rls_coverage.sql` via `psql` |

```bash
# Always safe in CI (migration SQL scan)
pnpm check:rls-coverage

# With local Supabase running:
pnpm db:status   # ensure DATABASE_URL is in env
DATABASE_URL=... pnpm check:rls-coverage
```

## Generate types

```bash
pnpm db:types
```

Writes `src/types/database.generated.ts` from the local schema.

## Cloud provision (Phase 0 Ops)

See [`docs/ops/supabase-cloud-provision.md`](../../docs/ops/supabase-cloud-provision.md).
In short: host in **Mumbai (`ap-south-1`)** or **Singapore (`ap-southeast-1`)**;
keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Local Docker remains the
default for Phase 0 E2E.
