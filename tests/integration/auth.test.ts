import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword, digestToken, newToken } from '../../apps/web/server/security.js';

const db = new PrismaClient();
const base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const email = `auth-${Date.now()}@example.test`;
const password = 'Integration only passphrase 2026!';
const post = (action: string, data: unknown, cookie = '', origin = base) => fetch(`${base}/api/auth/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie }, body: JSON.stringify(data), redirect: 'manual' });
let cookie = '';

beforeAll(async () => { await db.rateLimit.deleteMany(); });
afterAll(async () => { await db.user.deleteMany({ where: { email: { in: [email, `admin-${email}`] } } }); await db.$disconnect(); });

describe.sequential('real HTTP auth and database isolation', () => {
  it('rejects cross-site and malformed mutations', async () => {
    expect((await post('register', { email, password }, '', 'https://evil.example')).status).toBe(403);
    expect((await post('register', { email: 'bad', password: 'short' })).status).toBe(400);
  });
  it('rejects an oversized streamed request without content-length', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ name: 'x'.repeat(9000) }));
    const body = new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
    const init: RequestInit & { duplex: 'half' } = { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body, duplex: 'half' };
    expect((await fetch(`${base}/api/auth/register`, init)).status).toBe(413);
  });
  it('registers only a member despite forged privilege and identity fields', async () => {
    expect((await post('register', { email, password, name: 'Integration Member', brokerName: 'JUSTMARKET', mt5Account: '00123456', mt5Server: 'Synthetic-Demo', role: 'ADMIN', userId: 'victim' })).status).toBe(201);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe('MEMBER');
    expect(user.passwordHash).not.toContain(password);
    expect(user.id).not.toBe('victim');
    expect(user.brokerName).toBe('JUSTMARKET'); expect(user.mt5Account).toBe('00123456');
    const audit = await db.auditEvent.findFirstOrThrow({ where: { actorId: user.id, action: 'AUTH_REGISTER' } });
    expect(Math.abs(audit.createdAt.getTime() - Date.now())).toBeLessThan(60000);
  });
  it('rejects wrong password then creates a hashed session with safe cookies', async () => {
    expect((await post('login', { email, password: 'wrong' })).status).toBe(401);
    const response = await post('login', { email, password });
    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie')!;
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=lax');
    cookie = setCookie.split(';')[0];
    const token = cookie.slice(cookie.indexOf('=') + 1);
    expect(await db.session.findUnique({ where: { tokenHash: digestToken(token) } })).not.toBeNull();
  });
  it('allows free membership, keeps other features locked and rejects member admin access despite forged IDs', async () => {
    expect((await fetch(`${base}/app/membership?userId=victim`, { headers: { Cookie: cookie }, redirect: 'manual' })).status).toBe(200);
    expect((await fetch(`${base}/app`, { headers: { Cookie: cookie }, redirect: 'manual' })).headers.get('location')).toBe('/app/mt5');
    const response = await fetch(`${base}/admin?role=ADMIN`, { headers: { Cookie: cookie }, redirect: 'manual' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/app/mt5?notice=admin-required');
  });
  it('admits a database-created admin to the admin shell', async () => {
    await db.user.create({ data: { email: `admin-${email}`, name: 'Admin', role: 'ADMIN', passwordHash: await hashPassword(password) } });
    const login = await post('login', { email: `admin-${email}`, password });
    const adminCookie = login.headers.get('set-cookie')!.split(';')[0];
    expect((await fetch(`${base}/admin`, { headers: { Cookie: adminCookie } })).status).toBe(200);
  });
  it('expires sessions on the server', async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    await db.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
    expect((await fetch(`${base}/app`, { headers: { Cookie: cookie }, redirect: 'manual' })).status).toBe(307);
  });
  it('consumes reset token once, rejects expired links, revokes sessions and accepts only new password', async () => {
    const login = await post('login', { email, password });
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const expired = newToken();
    await db.passwordReset.create({ data: { userId: user.id, tokenHash: digestToken(expired), expiresAt: new Date(0) } });
    expect((await post('reset-password', { token: expired, password })).status).toBe(400);
    const token = newToken();
    await db.passwordReset.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 60000) } });
    expect((await post('reset-password', { token, password: `${password}new` })).status).toBe(200);
    expect((await post('reset-password', { token, password })).status).toBe(400);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    expect((await post('login', { email, password })).status).toBe(401);
    const response = await post('login', { email, password: `${password}new` });
    expect(response.status).toBe(200);
    cookie = response.headers.get('set-cookie')!.split(';')[0];
  });
  it('rejects off-origin logout and invalidates session on authorized logout', async () => {
    expect((await post('logout', {}, cookie, 'https://evil.example')).status).toBe(403);
    expect((await post('logout', {}, cookie)).status).toBe(200);
    expect((await fetch(`${base}/app`, { headers: { Cookie: cookie }, redirect: 'manual' })).status).toBe(307);
  });
  it('allows authenticated logout when anonymous authentication budgets are exhausted', async () => {
    await db.rateLimit.deleteMany({ where: { key: { startsWith: 'login-email:' } } });
    const response = await post('login', { email, password: `${password}new` });
    const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];
    const keys = [`auth-global:${digestToken('all')}`, `auth-public:login:${digestToken('all')}`];
    try {
      for (const key of keys) await db.rateLimit.upsert({ where: { key }, update: { hits: 120, expiresAt: new Date(Date.now() + 60000) }, create: { key, hits: 120, expiresAt: new Date(Date.now() + 60000) } });
      expect((await post('login', { email, password })).status).toBe(429);
      expect((await post('logout', {}, sessionCookie)).status).toBe(200);
    } finally { await db.rateLimit.deleteMany({ where: { key: { in: keys } } }); }
  });
  it('rate limits repeated credential attempts', async () => {
    const attemptEmail = `limit-${email}`;
    for (let n = 0; n < 8; n++) expect((await post('login', { email: attemptEmail, password })).status).toBe(401);
    expect((await post('login', { email: attemptEmail, password })).status).toBe(429);
    const budget = await db.rateLimit.findUniqueOrThrow({ where: { key: `login-email:${digestToken(attemptEmail)}` } });
    const remaining = budget.expiresAt.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(14 * 60 * 1000);
    expect(remaining).toBeLessThanOrEqual(15 * 60 * 1000);
  });
  it('does not provide broker execution endpoints', async () => {
    expect((await post('trade', { accountId: 'victim', command: 'CLOSE_ALL' })).status).toBe(404);
    expect((await fetch(`${base}/api/mt5/commands`, { method: 'POST' })).status).toBe(404);
  });
});
