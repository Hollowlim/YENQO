import { defineConfig, devices } from '@playwright/test';
import { loadEnvFile } from 'node:process';
import { requireLocalTestDatabase } from './tests/support/test-database';
try { loadEnvFile('.env'); } catch { /* Host environment is supported. */ }
requireLocalTestDatabase();
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'ipad', use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1112 }, hasTouch: true } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'pnpm start', url: 'http://127.0.0.1:3000', reuseExistingServer: !process.env.CI, timeout: 120000 },
});
