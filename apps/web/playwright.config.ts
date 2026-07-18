import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const webDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webDir, '../..');
const apiLogFile = path.join(webDir, 'e2e', '.api-e2e.log');

process.env.API_LOG_FILE = process.env.API_LOG_FILE ?? apiLogFile;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Always start fresh so API_LOG_FILE tee is active (needed for recovery OTP e2e)
      command: 'pnpm --filter @eduai/api build && pnpm --filter @eduai/api start',
      cwd: repoRoot,
      url: 'http://localhost:3000/health',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        ...process.env,
        API_PORT: '3000',
        CORS_ORIGIN: 'http://localhost:5173',
        API_LOG_FILE: process.env.API_LOG_FILE ?? apiLogFile,
      },
    },
    {
      command: 'pnpm --filter @eduai/web dev',
      cwd: repoRoot,
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        WEB_PORT: '5173',
        VITE_API_URL: 'http://localhost:3000',
      },
    },
  ],
});
