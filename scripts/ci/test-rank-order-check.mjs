#!/usr/bin/env node
/**
 * Verifies check-rank-order.mjs detects the deliberate fixture.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checker = path.join(__dirname, 'check-rank-order.mjs');
const fixturesDir = path.join(__dirname, 'fixtures');

const result = spawnSync(process.execPath, [checker, fixturesDir], {
  encoding: 'utf8',
});

if (result.status === 0) {
  console.error('Expected rank-order checker to fail on fixtures, but it passed.');
  process.exit(1);
}

if (!/Rank-order query check failed/.test(result.stderr)) {
  console.error('Checker failed for an unexpected reason:\n', result.stderr || result.stdout);
  process.exit(1);
}

console.log('Rank-order checker correctly flagged fixture SQL.');
