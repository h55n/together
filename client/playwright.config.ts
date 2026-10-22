import { defineConfig, devices } from '@playwright/test';

const clientURL = new URL(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5190');
const baseURL = clientURL.origin;
const serverURL = new URL(process.env.TOGETHER_E2E_SERVER_URL ?? 'http://127.0.0.1:3190');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  // Each test may create six complete GPU worlds. Parallel tests compete for
  // contexts and memory and make a driver failure look like a gameplay failure.
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: process.platform === 'win32' ? { args: ['--use-angle=d3d11'] } : {},
    screenshot: 'only-on-failure',
  },
  webServer: [{
    command: 'pnpm --filter @together/server dev',
    url: `${serverURL.origin}/readyz`,
    reuseExistingServer: Boolean(process.env.TOGETHER_E2E_REUSE_SERVER) && !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ALLOW_DEV_AUTH: 'true',
      // Natural weather is deterministic but varied; acceptance runs pin it so kayak rules are predictable.
      WORLD_WEATHER_FIXED: 'clear',
      // Start the city at 10:00 so opening-hour rules (kayak hut 08:00–18:30) are predictable.
      CITY_START_MINUTE: '600',
      CLIENT_URL: baseURL,
      PORT: serverURL.port || '80',
    },
  }, {
    command: `pnpm exec vite --host ${clientURL.hostname} --port ${clientURL.port || '80'} --strictPort`,
    url: baseURL,
    reuseExistingServer: Boolean(process.env.TOGETHER_E2E_REUSE_SERVER) && !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      VITE_SERVER_URL: serverURL.origin,
    },
  }],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
