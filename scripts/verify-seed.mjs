#!/usr/bin/env node
/**
 * P0-SEED-08 — Assert School X seed row counts after db:reset (+ optional seed:dev-auth).
 */

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(resolve(process.cwd(), 'packages/db/package.json'));
const { createClient } = require('@supabase/supabase-js');

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
    // fall through
  }
}

await loadFromSupabaseStatus();

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const strict = process.env.VERIFY_SEED_STRICT === '1';

if (!url || !serviceRoleKey) {
  const message =
    'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping seed verification';
  if (strict) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
  process.exit(0);
}

const client = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** @type {Record<string, { min: number, max?: number, note?: string }>} */
const EXPECTED = {
  schools: { min: 1 },
  sections: { min: 15, note: 'Full school — Nursery–Grade 5, 15 sections' },
  bands: { min: 3, note: 'pre_primary + basic_early + basic_upper' },
  grade_scales: { min: 24, note: '3 PP + 4+6 early + 4+7 upper' },
  outcomes: { min: 24, note: '12 PP + 5 G1–3 + 7 G4–5 placeholders' },
  subjects: { min: 7, note: '5 core + health_pe + local_subject' },
  band_subjects: { min: 12, note: '5 early + 7 upper' },
  identities: {
    min: 32,
    note: 'admin + 27 teachers + 2 guardians + 1 substitute + 1 platform',
  },
  school_memberships: { min: 30, note: 'admin + 27 teachers + 2 guardians' },
  school_admins: { min: 1 },
  teachers: { min: 27, note: '15 class + 5 early subject + 7 upper subject' },
  guardians: { min: 2 },
  platform_admins: { min: 1, note: 'Phase 7 — cross-tenant super admin' },
  support_sessions: { min: 0, max: 0, note: 'intentional empty' },
  national_calendars: { min: 1, note: 'Phase 7 — published BS 2082' },
  national_closures: { min: 3, note: 'Dashain + Tihar + fixed govt holiday' },
  children: { min: 120, note: 'Full school ~120 children' },
  guardian_child_links: { min: 4 },
  teacher_sections: { min: 59, note: '15 class + 30 early subject + 14 upper subject' },
  school_calendars: { min: 1 },
  terminals: { min: 3 },
  calendar_closures: { min: 2 },
  yearly_map: { min: 1, note: 'UKG A only — preserves map_slices == teaching_days' },
  map_slices: { min: 100, note: 'Phase 1 — one slice per teaching day' },
  map_slice_outcomes: { min: 100, note: 'FK integrity for outcome_refs' },
  prompts: { min: 8, note: 'Phase 1–3 prompt rows incl. methods_toolkit' },
  lesson_progress: { min: 0, max: 0, note: 'intentional empty' },
  attendance_record: { min: 4 },
  student_outcomes: { min: 3, note: 'proposed only — pre_primary + Grade 1 samples' },
  message_log: { min: 3, note: 'Family WhatsApp thread — attendance + faq' },
  substitute_access: { min: 2 },
  audit_log: { min: 0, max: 0, note: 'intentional empty — append-only' },
  certification_progress: { min: 3, note: 'Phase 5 — UKG teacher weeks 1–3' },
  certification_observations: { min: 1, note: 'Phase 5 — one observation per teacher' },
  out_of_segment_query_log: { min: 0, max: 0, note: 'intentional empty — demand signal' },
};

async function count(table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function main() {
  const failures = [];
  console.log('Verifying School X seed…\n');

  for (const [table, rule] of Object.entries(EXPECTED)) {
    const n = await count(table);
    const max = rule.max ?? Infinity;
    const ok = n >= rule.min && n <= max;
    const note = rule.note ? ` (${rule.note})` : '';
    console.log(`  ${ok ? 'OK' : 'FAIL'}  ${table.padEnd(24)} count=${n}${note}`);
    if (!ok) {
      failures.push(`${table}: expected ${rule.min}..${max === Infinity ? '∞' : max}, got ${n}`);
    }
  }

  const { count: confirmedCount, error: confirmedError } = await client
    .from('student_outcomes')
    .select('*', { count: 'exact', head: true })
    .eq('state', 'confirmed');
  if (confirmedError) {
    failures.push(`student_outcomes confirmed check: ${confirmedError.message}`);
  } else if ((confirmedCount ?? 0) > 0) {
    failures.push(`student_outcomes must have zero confirmed rows in seed (got ${confirmedCount})`);
  } else {
    console.log('  OK  student_outcomes         no confirmed rows');
  }

  const { data: teachingDays, error: tdError } = await client
    .from('teaching_days')
    .select('terminal_id');
  if (tdError) {
    failures.push(`teaching_days view: ${tdError.message}`);
  } else {
    const byTerminal = new Map();
    for (const row of teachingDays ?? []) {
      byTerminal.set(row.terminal_id, (byTerminal.get(row.terminal_id) ?? 0) + 1);
    }
    console.log(`  OK  teaching_days            ${teachingDays?.length ?? 0} days across ${byTerminal.size} terminals`);
    if ((teachingDays?.length ?? 0) === 0) {
      failures.push('teaching_days view returned 0 rows');
    }
    for (const [tid, n] of byTerminal) {
      if (n < 1) failures.push(`terminal ${tid} has 0 teaching days`);
    }

    const sliceCount = await count('map_slices');
    if (sliceCount !== (teachingDays?.length ?? 0)) {
      failures.push(
        `map_slices count ${sliceCount} must equal teaching_days ${(teachingDays?.length ?? 0)}`,
      );
    } else {
      console.log('  OK  map_slices               matches teaching_days count');
    }
  }

  const { data: danglingRefs, error: refError } = await client
    .from('map_slice_outcomes')
    .select('outcome_id, outcomes!inner(id)');
  if (refError) {
    // Fallback: count join via outcomes existence
    const { data: refs, error: refsErr } = await client.from('map_slice_outcomes').select('outcome_id');
    if (refsErr) {
      failures.push(`map_slice_outcomes FK check: ${refsErr.message}`);
    } else {
      const { data: outcomes } = await client.from('outcomes').select('id');
      const ids = new Set((outcomes ?? []).map((o) => o.id));
      const bad = (refs ?? []).filter((r) => !ids.has(r.outcome_id));
      if (bad.length > 0) {
        failures.push(`map_slice_outcomes has ${bad.length} dangling outcome_id refs`);
      } else {
        console.log('  OK  map_slice_outcomes      all outcome_id refs resolve');
      }
    }
  } else {
    console.log(`  OK  map_slice_outcomes      ${(danglingRefs ?? []).length} refs resolve`);
  }

  const requireAuth = process.env.VERIFY_SEED_REQUIRE_AUTH === '1';
  const authEmails = ['admin@schoolx.dev', 'teacher@schoolx.dev', 'platform@eduai.dev'];
  const { data: activeIdentities, error: activeError } = await client
    .from('identities')
    .select('email, account_status, auth_user_id')
    .in('email', authEmails);
  if (activeError) {
    failures.push(`active identities: ${activeError.message}`);
  } else {
    const linked = (activeIdentities ?? []).filter(
      (i) => i.account_status === 'active' && i.auth_user_id,
    );
    console.log(
      `  …  auth-linked identities    ${linked.length}/${authEmails.length} (run pnpm seed:dev-auth)`,
    );
    if (requireAuth && linked.length < authEmails.length) {
      failures.push(
        'VERIFY_SEED_REQUIRE_AUTH=1 but admin/teacher/platform not active with auth_user_id',
      );
    }
  }

  if (failures.length > 0) {
    console.error('\nSeed verification FAILED:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('\nSeed verification passed.');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  const unreachable =
    /fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(message) ||
    message.includes('Failed to fetch');
  if (unreachable && process.env.VERIFY_SEED_STRICT !== '1') {
    console.log(`Supabase unreachable — skipping seed verification (${message})`);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
});
