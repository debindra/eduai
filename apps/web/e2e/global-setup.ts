import { createRequire } from 'node:module';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import type { FullConfig } from '@playwright/test';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const TEACHER_IDENTITY_ID = '22222222-2222-2222-2222-222222222222';
const TEACHER_PHONE = '9811111111';

function loadDotEnv(): void {
  const envPath = resolve(REPO_ROOT, '.env');
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

function loadFromSupabaseStatus(): void {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const out = execFileSync(
      'pnpm',
      ['--filter', '@eduai/db', 'exec', 'supabase', 'status', '-o', 'env'],
      { encoding: 'utf8', cwd: REPO_ROOT },
    );
    for (const line of out.split('\n')) {
      const m = line.match(/^(API_URL|SERVICE_ROLE_KEY)="?(.*?)"?\s*$/);
      if (!m) continue;
      if (m[1] === 'API_URL' && !process.env.SUPABASE_URL) {
        process.env.SUPABASE_URL = m[2];
      }
      if (m[1] === 'SERVICE_ROLE_KEY' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = m[2];
      }
    }
  } catch {
    // fall through
  }
}

function ensureSupabaseRunning(): void {
  try {
    execFileSync('pnpm', ['--filter', '@eduai/db', 'exec', 'supabase', 'status'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  } catch {
    console.log('Supabase not running — starting local stack…');
    try {
      execFileSync('pnpm', ['db:start'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
    } catch {
      throw new Error(
        'Could not start local Supabase. Run `pnpm db:start` manually, then retry e2e.',
      );
    }
  }
}

async function attachTeacherPhone(): Promise<void> {
  const require = createRequire(resolve(REPO_ROOT, 'packages/db/package.json'));
  const { createClient } = require('@supabase/supabase-js') as {
    createClient: (
      url: string,
      key: string,
      options?: { auth?: { autoRefreshToken?: boolean; persistSession?: boolean } },
    ) => {
      from: (table: string) => {
        update: (values: Record<string, unknown>) => {
          eq: (
            column: string,
            value: string,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  };

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY after db:status',
    );
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin
    .from('identities')
    .update({ phone: TEACHER_PHONE })
    .eq('id', TEACHER_IDENTITY_ID);

  if (error) {
    throw new Error(`Failed to attach teacher phone: ${error.message}`);
  }
  console.log(`Attached phone ${TEACHER_PHONE} to teacher identity for recovery e2e`);
}

function waitForAuthHealth(timeoutMs = 90_000): void {
  const url = `${process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'}/auth/v1/health`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const code = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', url], {
        encoding: 'utf8',
      }).trim();
      if (code === '200') {
        console.log('Supabase Auth healthy');
        return;
      }
    } catch {
      // retry
    }
    execFileSync('sleep', ['2']);
  }
  throw new Error(
    `Supabase Auth did not become healthy within ${timeoutMs}ms (${url}). Try \`pnpm db:stop && pnpm db:start\`.`,
  );
}

function seedDevAuthWithRetry(attempts = 5): void {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      execFileSync('pnpm', ['seed:dev-auth'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
      return;
    } catch (err) {
      lastError = err;
      console.warn(`seed:dev-auth attempt ${i}/${attempts} failed — waiting for Auth…`);
      waitForAuthHealth(30_000);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('seed:dev-auth failed after retries');
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  loadDotEnv();
  ensureSupabaseRunning();
  loadFromSupabaseStatus();

  const apiLogFile =
    process.env.API_LOG_FILE ??
    resolve(dirname(fileURLToPath(import.meta.url)), '.api-e2e.log');
  process.env.API_LOG_FILE = apiLogFile;
  if (existsSync(apiLogFile)) {
    unlinkSync(apiLogFile);
  }
  writeFileSync(apiLogFile, '');

  console.log('Resetting database…');
  execFileSync('pnpm', ['db:reset'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  // db:reset restarts containers; Auth often returns 502 briefly afterward
  waitForAuthHealth();

  console.log('Seeding auth users…');
  seedDevAuthWithRetry();

  await attachTeacherPhone();
}
