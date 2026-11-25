import { defineConfig } from 'vitest/config';
import { loadEnvFile } from 'node:process';
import { requireLocalTestDatabase } from './tests/support/test-database';
try { loadEnvFile('.env'); } catch { /* Host environment is supported. */ }
requireLocalTestDatabase();
export default defineConfig({ test: { include: ['tests/integration/**/*.test.ts'], environment: 'node', fileParallelism: false, testTimeout: 30000 } });
