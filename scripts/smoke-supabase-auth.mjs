import { loadEnvFile } from 'node:process';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
loadEnvFile('.env');
const db = new PrismaClient();
const base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const email = `supabase-smoke-${randomUUID()}@example.test`, password = randomBytes(30).toString('base64url');
const post = (action, data) => fetch(`${base}/api/auth/${action}`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const assert = (value, message) => { if (!value) throw new Error(message); };
try {
  const registered = await post('register', { name: 'Temporary Supabase smoke test', email, password, brokerName: 'JUSTMARKET', mt5Account: '00009999', mt5Server: 'Synthetic test only' });
  assert(registered.status === 201, 'registration');
  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, mt5Account: true, role: true } });
  assert(user?.role === 'MEMBER' && user.mt5Account === '00009999' && user.passwordHash.startsWith('scrypt-v1:') && !user.passwordHash.includes(password), 'stored fields');
  const login = await post('login', { email, password }); assert(login.status === 200, 'login');
  const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert(cookie, 'session cookie');
  const profile = await fetch(`${base}/api/profile`, { headers: { Cookie: cookie } });
  assert(profile.status === 200 && (await profile.json()).profile.mt5Account === '00009999', 'own profile');
  assert((await fetch(`${base}/api/admin/clients`, { headers: { Cookie: cookie } })).status === 403, 'admin boundary');
  const adminLogin = await post('login', { username: process.env.LOCAL_ADMIN_USERNAME, password: process.env.LOCAL_ADMIN_PASSWORD });
  assert(adminLogin.status === 200, 'existing admin login');
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0]; assert(adminCookie, 'admin cookie');
  const directory = await fetch(`${base}/api/admin/clients?search=${encodeURIComponent(email)}`, { headers: { Cookie: adminCookie } });
  assert(directory.status === 200 && (await directory.json()).clients.some(row => row.id === user.id), 'admin directory');
  const access = await db.$queryRaw`SELECT c.relname, c.relrowsecurity, has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access, has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS authenticated_access FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`;
  assert(access.length === 12 && access.every(row => row.relrowsecurity && !row.anon_access && !row.authenticated_access), 'private table permissions');
  const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Origin: base, Cookie: adminCookie, 'Content-Type': 'application/json' }, body: '{}' }); assert(logout.ok, 'admin logout');
  await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' });
  console.log('Hosted smoke checks passed: signup, hashed password storage, login/session, own broker profile, admin login/directory, member/admin isolation, and all 12 private table access checks.');
} catch (error) {
  const safe = ['registration','stored fields','login','session cookie','own profile','admin boundary','existing admin login','admin cookie','admin directory','private table permissions','admin logout'];
  console.error(`Hosted smoke check failed at: ${safe.includes(error.message) ? error.message : 'connection or verification'}. Credentials omitted.`); process.exitCode = 1;
} finally { await db.user.deleteMany({ where: { email } }); await db.$disconnect(); console.log('Temporary smoke-test client removed.'); }
