import { defineConfig, devices } from '@playwright/test';
import { requireLocalTestDatabase } from './tests/support/test-database';

// This suite mutates a disposable local database. Never load deployment .env files.
requireLocalTestDatabase();
const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3117';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) {
  throw new Error('V6 authenticated browser checks require an isolated local app.');
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'v6-authenticated.spec.ts',
  outputDir: '.tools/v6-auth-test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 10000 },
  reporter: [['list']],
  use: { baseURL: origin, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
