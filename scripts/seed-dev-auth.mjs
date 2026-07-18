#!/usr/bin/env node
/**
 * P0-SEED-04 — Link seed identities to Supabase Auth users.
 * Run after `pnpm db:reset`. Never writes password hashes to Postgres.
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (or repo-root .env).
 */

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(resolve(process.cwd(), 'packages/db/package.json'));
const { createClient } = require('@supabase/supabase-js');

const DEV_PASSWORD = process.env.SEED_DEV_PASSWORD ?? 'DevPassword123!';

const USERS = [
  {
    identityId: '22222222-2222-2222-2222-222222222221',
    email: 'admin@schoolx.dev',
    role: 'admin',
  },
  {
    identityId: '22222222-2222-2222-2222-222222222222',
    email: 'teacher@schoolx.dev',
    role: 'teacher',
  },
];

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

async function loadFromSupabaseStatus() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { execFileSync } = await import('node:child_process');
  try {
    const out = execFileSync('pnpm', ['--filter', '@eduai/db', 'exec', 'supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
    for (const line of out.split('\n')) {
      const m = line.match(/^(API_URL|SERVICE_ROLE_KEY)="?(.*?)"?\s*$/);
      if (!m) continue;
      if (m[1] === 'API_URL' && !process.env.SUPABASE_URL) process.env.SUPABASE_URL = m[2];
      if (m[1] === 'SERVICE_ROLE_KEY' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = m[2];
      }
    }
  } catch {
    // fall through to missing-env check
  }
}

await loadFromSupabaseStatus();

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set in .env after pnpm db:status)');
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAuthUser(email, password) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    throw new Error(`listUsers failed: ${listError.message}`);
  }
  const existing = listed.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      throw new Error(`updateUserById failed for ${email}: ${updateError.message}`);
    }
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser failed for ${email}: ${error?.message ?? 'unknown'}`);
  }
  return data.user.id;
}

async function linkIdentity(identityId, authUserId) {
  const { error } = await admin
    .from('identities')
    .update({
      auth_user_id: authUserId,
      account_status: 'active',
      invite_token_hash: null,
      invite_expires_at: null,
    })
    .eq('id', identityId);
  if (error) {
    throw new Error(`Failed to link identity ${identityId}: ${error.message}`);
  }
}

async function main() {
  console.log('Seeding Supabase Auth users for School X…\n');
  for (const user of USERS) {
    const authUserId = await ensureAuthUser(user.email, DEV_PASSWORD);
    await linkIdentity(user.identityId, authUserId);
    console.log(`  ${user.role.padEnd(8)} ${user.email}  →  auth_user_id=${authUserId}`);
  }
  console.log('\nLocal login credentials (dev only):');
  console.log(`  admin:   admin@schoolx.dev / ${DEV_PASSWORD}`);
  console.log(`  teacher: teacher@schoolx.dev / ${DEV_PASSWORD}`);
  console.log('\nGuardians remain WhatsApp-only (no auth_user_id).');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
