#!/usr/bin/env node
/**
 * Verifies that frontend API types are in sync with backend OpenAPI spec.
 * Prevents type drift between backend and frontend.
 *
 * Usage:
 *   node scripts/ci/verify-api-types.mjs
 *
 * Prerequisites:
 *   - Backend API must be built first (pnpm --filter @eduai/api build)
 *   - OpenAPI spec exported at /api/docs-json endpoint
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import process from 'node:process';

const execAsync = promisify(exec);

async function verifyApiTypes() {
  console.log('Verifying API types are in sync with backend...\n');

  try {
    // Step 1: Generate types from OpenAPI spec
    console.log('Generating API types from OpenAPI spec...');
    await execAsync('pnpm generate:api-types');
    console.log('✓ Types generated successfully\n');

    // Step 2: Check for uncommitted changes
    console.log('Checking for uncommitted changes in generated types...');
    const { stdout } = await execAsync('git diff apps/web/src/lib/shared/api/generated-types.ts');

    if (stdout.trim() !== '') {
      console.error('❌ ERROR: API types are out of sync with backend!\n');
      console.error('The generated types file has uncommitted changes.');
      console.error('This means the backend API has changed but frontend types have not been updated.\n');
      console.error('To fix:');
      console.error('  1. Run: pnpm generate:api-types');
      console.error('  2. Commit the updated types file');
      console.error('  3. Push your changes\n');
      console.error('Diff preview:');
      console.error(stdout);
      process.exit(1);
    }

    console.log('✓ API types are in sync with backend\n');
    console.log('✅ API types verification passed');
  } catch (error) {
    console.error('❌ API types verification failed:', error.message);
    process.exit(1);
  }
}

verifyApiTypes().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
