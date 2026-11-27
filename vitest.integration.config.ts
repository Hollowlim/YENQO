import { defineConfig } from 'vitest/config';
import { loadEnvFile } from 'node:process';
import { requireLocalTestDatabase } from './tests/support/test-database';
try { loadEnvFile('.env'); } catch { /* Host environment is supported. */ }
requireLocalTestDatabase();
// The free trial is off here and on the local server (MEMBER_TRIAL_DAYS=0) so locked free-member rules stay covered.
export default defineConfig({ test: { include: ['tests/integration/**/*.test.ts'], env: { MEMBER_TRIAL_DAYS: '0' }, environment: 'node', fileParallelism: false, testTimeout: 30000 } });
