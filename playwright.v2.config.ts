import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, testMatch: ['v2-premium.spec.ts','admin-direct-membership.spec.ts','community.spec.ts'], use: { ...base.use, baseURL:'http://127.0.0.1:3001' }, webServer: { command:`"${process.execPath}" scripts/with-local-database.mjs server`, url:'http://127.0.0.1:3001',reuseExistingServer:true,timeout:120000 } });
