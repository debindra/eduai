#!/usr/bin/env node
/**
 * Fails if SQL/TS under scan roots contains rank-order queries:
 * ORDER BY on rating, percentage, letter_grade, or band_code across rows.
 *
 * Usage:
 *   node scripts/ci/check-rank-order.mjs
 *   node scripts/ci/check-rank-order.mjs scripts/ci/fixtures
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_ROOTS = [
  path.join(repoRoot, 'apps/api/src'),
  path.join(repoRoot, 'apps/docgen/src'),
  path.join(repoRoot, 'packages/db/supabase/migrations'),
];

const SCAN_EXTENSIONS = new Set(['.sql', '.ts', '.tsx', '.js', '.jsx']);

// Banned columns that must never be used for ranking/ordering across children
const BANNED_COLUMNS = ['rating', 'percentage', 'letter_grade', 'band_code'];

// Pattern 1: Direct ORDER BY on banned columns
const ORDER_BY_PATTERN =
  /ORDER\s+BY[\s\S]{0,120}?(rating|percentage|letter_grade|band_code)/i;

// Pattern 2: Window functions (RANK, DENSE_RANK, ROW_NUMBER) with ORDER BY on banned columns
const WINDOW_FUNCTIONS = ['RANK', 'DENSE_RANK', 'ROW_NUMBER'];
const WINDOW_PATTERN = new RegExp(
  `(${WINDOW_FUNCTIONS.join('|')})\\s*\\([^)]*\\)\\s+OVER\\s*\\([^)]*ORDER\\s+BY[^)]*?(${BANNED_COLUMNS.join('|')})`,
  'i'
);

// Pattern 3: Percentile aggregates over banned columns
const PERCENTILE_PATTERN = new RegExp(
  `(percentile_cont|percentile_disc)\\s*\\([^)]*?(${BANNED_COLUMNS.join('|')})`,
  'i'
);

function stripComments(content, filePath) {
  if (filePath.endsWith('.sql')) {
    return content.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  }
  return content
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

async function walk(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      await walk(fullPath, files);
      continue;
    }
    const ext = path.extname(entry.name);
    if (SCAN_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function scanRoots(roots) {
  const violations = [];
  const patterns = [
    { name: 'ORDER BY', regex: ORDER_BY_PATTERN },
    { name: 'Window function', regex: WINDOW_PATTERN },
    { name: 'Percentile aggregate', regex: PERCENTILE_PATTERN },
  ];

  for (const root of roots) {
    const files = await walk(root);
    for (const filePath of files) {
      const raw = await readFile(filePath, 'utf8');
      const content = stripComments(raw, filePath);

      // Check all patterns
      for (const { name, regex } of patterns) {
        const match = content.match(regex);
        if (match) {
          violations.push({
            file: path.relative(repoRoot, filePath),
            type: name,
            snippet: match[0].replace(/\s+/g, ' ').trim(),
          });
        }
      }
    }
  }
  return violations;
}

const cliRoots = process.argv.slice(2).map((arg) => path.resolve(process.cwd(), arg));
const roots = cliRoots.length > 0 ? cliRoots : DEFAULT_ROOTS;

const violations = await scanRoots(roots);

if (violations.length > 0) {
  console.error('Rank-order query check failed. Banned patterns found:\n');
  for (const violation of violations) {
    console.error(`  ${violation.file}`);
    console.error(`    Type: ${violation.type}`);
    console.error(`    ${violation.snippet}\n`);
  }
  console.error(`Invariant #2: No rank-order queries across children.`);
  console.error(`Banned columns: ${BANNED_COLUMNS.join(', ')}`);
  console.error(`Banned operations: ORDER BY, RANK(), DENSE_RANK(), ROW_NUMBER(), percentile functions\n`);
  process.exit(1);
}

console.log(`Rank-order check passed (${roots.map((r) => path.relative(repoRoot, r)).join(', ')})`);
