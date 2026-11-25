import { defineConfig } from '@playwright/test';
import base from './playwright.v2.config';
export default defineConfig({...base,testMatch:['account-audit.spec.ts','v2-premium.spec.ts','admin-direct-membership.spec.ts','community.spec.ts','education.spec.ts','editorial.spec.ts','dashboard.spec.ts']});
