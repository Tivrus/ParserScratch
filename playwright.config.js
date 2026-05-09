// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'node server.js',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      /** Не писать `workspace.json` в процессе, который поднимает Playwright (дубль к заголовку E2E). */
      SCRATCH_SKIP_WORKSPACE_DISK_SAVE: '1',
    },
  },
});
