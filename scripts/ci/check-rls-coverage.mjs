#!/usr/bin/env node
/**
 * Ensures critical pedagogy tables have RLS policies in migration SQL.
 * Optionally runs psql policy introspection when DATABASE_URL is set.
 */

import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const migrationsDir = path.join(repoRoot, 'packages/db/supabase/migrations');
const rlsCoverageSql = path.join(
  repoRoot,
  'packages/db/supabase/tests/rls_coverage.sql',
);

const REQUIRED_POLICIES = [
  // Core assessment & tracking
  { table: 'student_outcomes', needle: 'CREATE POLICY' },
  { table: 'ratings', needle: 'CREATE POLICY' },
  { table: 'attendance_record', needle: 'CREATE POLICY' },
  { table: 'lesson_progress', needle: 'CREATE POLICY' },
  { table: 'remedial_plans', needle: 'CREATE POLICY' },

  // RBAC & access control
  { table: 'teacher_sections', needle: 'CREATE POLICY' },
  { table: 'sections', needle: 'CREATE POLICY' },

  // Family & child data
  { table: 'children', needle: 'CREATE POLICY' }, // Special case: read-only via RLS
  { table: 'guardians', needle: 'CREATE POLICY' },

  // Curriculum & planning
  { table: 'yearly_map', needle: 'CREATE POLICY' },
  { table: 'map_slices', needle: 'CREATE POLICY' },
  { table: 'map_slice_outcomes', needle: 'CREATE POLICY' },
  { table: 'curriculum_areas', needle: 'CREATE POLICY' },
  { table: 'rollup_domains', needle: 'CREATE POLICY' },
  { table: 'assessment_areas', needle: 'CREATE POLICY' },
  { table: 'indicators', needle: 'CREATE POLICY' },

  // AI & messaging
  { table: 'prompts', needle: 'CREATE POLICY' },
  { table: 'coach_messages', needle: 'CREATE POLICY' },

  // Reports & handover
  { table: 'parent_report_drafts', needle: 'CREATE POLICY' },
  // Propose/Confirm lives on student_outcomes.state — not a separate assessment_proposals table
  { table: 'handover_pack', needle: 'CREATE POLICY' },
];

async function readMigrationSql() {
  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const chunks = await Promise.all(
    files.map((name) => readFile(path.join(migrationsDir, name), 'utf8')),
  );
  return chunks.join('\n');
}

function assertMigrationPolicies(sql) {
  const missing = REQUIRED_POLICIES.filter(
    ({ table, needle }) =>
      !new RegExp(`${needle}[\\s\\S]*?ON\\s+${table}\\b`, 'i').test(sql),
  );
  if (missing.length > 0) {
    console.error('RLS coverage check failed — missing CREATE POLICY for:');
    for (const item of missing) {
      console.error(`  - ${item.table}`);
    }
    process.exit(1);
  }
}

function tryPsqlCheck() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set — skipping live psql RLS introspection.');
    return;
  }

  const tables = REQUIRED_POLICIES.map(({ table }) => table).join("','");
  const query = `
    SELECT tablename, COUNT(*) AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('${tables}')
    GROUP BY tablename
    ORDER BY tablename;
  `;

  const result = spawnSync('psql', [databaseUrl, '-At', '-c', query], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    console.warn('psql RLS introspection skipped:', result.stderr.trim());
    return;
  }

  const rows = result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [table, count] = line.split('|');
      return { table, count: Number(count) };
    });

  for (const { table } of REQUIRED_POLICIES) {
    const row = rows.find((entry) => entry.table === table);
    if (!row || row.count < 1) {
      console.error(`Live DB missing RLS policies on ${table}`);
      process.exit(1);
    }
  }

  console.log('Live psql RLS introspection passed.');

  const fileResult = spawnSync(
    'psql',
    [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', rlsCoverageSql],
    { encoding: 'utf8' },
  );
  if (fileResult.status !== 0) {
    console.error('rls_coverage.sql failed:');
    console.error(fileResult.stderr || fileResult.stdout);
    process.exit(1);
  }
  console.log('rls_coverage.sql passed.');
}

const sql = await readMigrationSql();
assertMigrationPolicies(sql);
tryPsqlCheck();
console.log('RLS coverage file check passed.');
