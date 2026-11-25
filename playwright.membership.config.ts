import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, testMatch: 'admin-direct-membership.spec.ts', use: { ...base.use, baseURL: 'http://127.0.0.1:3001' }, webServer: { command: 'node scripts/with-local-database.mjs server', url: 'http://127.0.0.1:3001', reuseExistingServer: true, timeout: 120000 } });
