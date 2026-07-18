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
  path.join(repoRoot, 'packages/db/supabase/migrations'),
];

const SCAN_EXTENSIONS = new Set(['.sql', '.ts', '.tsx', '.js', '.jsx']);
const BANNED_PATTERN =
  /ORDER\s+BY[\s\S]{0,120}?(rating|percentage|letter_grade|band_code)/i;

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
  for (const root of roots) {
    const files = await walk(root);
    for (const filePath of files) {
      const raw = await readFile(filePath, 'utf8');
      const content = stripComments(raw, filePath);
      const match = content.match(BANNED_PATTERN);
      if (match) {
        violations.push({
          file: path.relative(repoRoot, filePath),
          snippet: match[0].replace(/\s+/g, ' ').trim(),
        });
      }
    }
  }
  return violations;
}

const cliRoots = process.argv.slice(2).map((arg) => path.resolve(process.cwd(), arg));
const roots = cliRoots.length > 0 ? cliRoots : DEFAULT_ROOTS;

const violations = await scanRoots(roots);

if (violations.length > 0) {
  console.error('Rank-order query check failed. Banned ORDER BY patterns found:\n');
  for (const violation of violations) {
    console.error(`  ${violation.file}`);
    console.error(`    ${violation.snippet}\n`);
  }
  process.exit(1);
}

console.log(`Rank-order check passed (${roots.map((r) => path.relative(repoRoot, r)).join(', ')})`);
