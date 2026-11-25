import { loadEnvFile } from 'node:process';
loadEnvFile('.env');
const base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
let cookie;
try {
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.LOCAL_ADMIN_USERNAME, password: process.env.LOCAL_ADMIN_PASSWORD }) });
  if (!login.ok) throw new Error('login');
  cookie = login.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error('session');
  const response = await fetch(`${base}/api/admin/memberships`, { headers: { Cookie: cookie } });
  if (!response.ok) throw new Error('directory');
  const data = await response.json();
  const rows = data.memberships;
  if (!Array.isArray(rows) || !rows.every(row => Number.isInteger(row.user.profileVersion) && Object.hasOwn(row.user, 'mt5Account'))) throw new Error('projection');
  console.log(`Admin directory check passed: ${rows.length} members, ${rows.filter(row => row.status === 'FREE').length} FREE. No membership decisions changed.`);
} catch {
  console.error('Admin directory check failed. Credentials omitted.');
  process.exitCode = 1;
} finally {
  if (cookie) await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' });
}
