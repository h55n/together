import { defineConfig, devices } from '@playwright/test';

const baseURL = new URL(process.env.TOGETHER_E2E_URL ?? 'http://localhost:5173').origin;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm -C .. dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      ALLOW_DEV_AUTH: 'true',
      CLIENT_URL: 'http://localhost:5173',
      VITE_SERVER_URL: 'http://localhost:3001',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
