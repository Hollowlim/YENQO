// Keep fixture suites and development servers away from the hosted database.
import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
loadEnvFile('.env');
delete process.env.DATABASE_URL;
loadEnvFile('.env.local-database');
if (!['127.0.0.1','localhost'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('An isolated local database is required.');
const mode = process.argv[2];
const delivery = mode === 'delivery' || mode === 'delivery-server';
const entry = mode === 'server' ? ['apps/web/server/index.js','--production'] : mode === 'integration' ? [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run','--config','vitest.integration.config.ts'] : mode === 'browser' ? [fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url)),'test','--config','playwright.membership.config.ts'] : null;
const command = delivery ? mode === 'delivery-server' ? [fileURLToPath(new URL('../apps/web/server/index.js',import.meta.url))] : [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs',import.meta.url)),'run','--config','vitest.delivery.config.ts'] : entry;
if (!command) throw new Error('Choose server, integration, browser, delivery or delivery-server.');
if (mode === 'browser' && process.argv.includes('--v2')) entry[entry.length - 1] = 'playwright.v2.config.ts';
if (mode === 'browser' && process.argv.includes('--audit')) entry[entry.length - 1] = 'playwright.audit.config.ts';
const origin = `http://127.0.0.1:${delivery ? '3002' : '3001'}`;
const child = spawn(process.execPath, command, { stdio: 'inherit', ...(mode === 'delivery-server' ? {cwd:fileURLToPath(new URL('../apps/web',import.meta.url))}:{}), env: { ...process.env, RESEND_API_KEY:'', RESET_EMAIL_FROM:'', ...(delivery ? {NODE_ENV:'development',DEV_EMAIL_OUTBOX:'true',RESET_DELIVERY_ORIGIN:origin}:{}), PORT: delivery ? '3002':'3001', APP_ORIGIN: origin } });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
