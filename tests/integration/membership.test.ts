import { beforeAll, afterAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword, newToken, digestToken } from '../../apps/web/server/security.js';
import { spawnSync } from 'node:child_process';
const db = new PrismaClient();
const base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const tag = `ib-${Date.now()}`;
const password = 'Membership test passphrase only!';
const email = `${tag}@example.test`, otherEmail = `other-${email}`, adminEmail = `admin-${email}`;
let memberCookie = '', otherCookie = '', adminCookie = '', memberId = '', membershipId = '';
const post = (route: string, data: unknown, cookie = '', origin = base) => fetch(base + route, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(data), redirect: 'manual' });
const get = (route: string, cookie = '') => fetch(base + route, { headers: { Cookie: cookie }, redirect: 'manual' });
const claim = { brokerName: 'JUSTMARKET', ibCode: 'jai4w0w6', mt5Account: '00121234', depositAmount: '100.00', version: 0 };
const review = { action: 'approve', version: 1, verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositAmount: '100.00', confirmed: true, reason: 'Synthetic test verification; no real deposit.' };
beforeAll(async () => {
  await db.rateLimit.deleteMany();
  await db.user.create({ data: { email: adminEmail, username: tag.toUpperCase(), name: 'Test Reviewer', role: 'ADMIN', passwordHash: await hashPassword(password) } });
  for (const address of [email, otherEmail]) expect((await post('/api/auth/register', { name: 'Test Member', email: address, password, username: 'YENGFX', role: 'ADMIN' })).status).toBe(201);
  const login = async (data: unknown) => { const r = await post('/api/auth/login', data); expect(r.status).toBe(200); return r.headers.get('set-cookie')!.split(';')[0]; };
  memberCookie = await login({ email, password }); otherCookie = await login({ email: otherEmail, password });
  adminCookie = await login({ username: tag.toLowerCase(), password });
  const member = await db.user.findUniqueOrThrow({ where: { email }, include: { membership: true } });
  memberId = member.id; membershipId = member.membership!.id;
  expect(member.username).toBeNull(); expect(member.role).toBe('MEMBER');
});
afterAll(async () => { await db.user.deleteMany({ where: { email: { in: [email, otherEmail, adminEmail] } } }); await db.$disconnect(); });

it('keeps free members on membership and denies private/admin membership reads without proper authority', async () => {
  expect((await get('/api/membership/me')).status).toBe(401);
  expect((await get('/api/admin/memberships', memberCookie)).status).toBe(403);
  expect((await get('/app/membership', memberCookie)).status).toBe(200);
  const locked = await get('/app/academy', memberCookie);
  expect(locked.status).toBe(307); expect(locked.headers.get('location')).toContain('/app/membership');
  expect((await get('/app', memberCookie)).headers.get('location')).toBe('/app/mt5');
});
it('scopes claims to the principal and never accepts forged verification or a client userId', async () => {
  const other = await db.user.findUniqueOrThrow({ where: { email: otherEmail } });
  const response = await post('/api/membership/request', { ...claim, userId: other.id, status: 'APPROVED', verifiedDepositCents: 100000 }, memberCookie);
  expect(response.status).toBe(200);
  expect((await response.json()).membership.status).toBe('PENDING');
  const profile = await db.user.findUniqueOrThrow({ where: { id: memberId } });
  expect(profile.mt5Account).toBe('00121234');
  expect(profile.brokerName).toBe('JUSTMARKET');
  expect((await db.membership.findUniqueOrThrow({ where: { userId: other.id } })).status).toBe('FREE');
  const own = await get(`/api/membership/me?userId=${memberId}`, otherCookie);
  expect((await own.json()).membership.status).toBe('FREE');
  expect((await post(`/api/admin/memberships/${membershipId}/review`, review, memberCookie)).status).toBe(403);
});
it('rejects wrong IB/broker, insufficient verified deposits, missing confirmation and cross-site review', async () => {
  const url = `/api/admin/memberships/${membershipId}/review`;
  for (const change of [{ verifiedIbCode: 'wrong' }, { verifiedBroker: 'OTHER' }, { verifiedDepositAmount: '99.99' }, { confirmed: false }]) expect((await post(url, { ...review, ...change }, adminCookie)).status).toBe(400);
  expect((await post(url, review, adminCookie, 'https://evil.example')).status).toBe(403);
  expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).status).toBe('PENDING');
});
it('grants full member features after authorized review without granting administration', async () => {
  expect((await post(`/api/admin/memberships/${membershipId}/review`, review, adminCookie)).status).toBe(200);
  expect((await get('/app/academy', memberCookie)).status).toBe(200);
  expect((await get('/app/mt5', memberCookie)).status).toBe(200);
  expect((await get('/admin', memberCookie)).status).toBe(307);
  const own = await get('/api/membership/me', memberCookie);
  expect((await own.json()).fullAccess).toBe(true);
  const list = await get('/api/admin/memberships', adminCookie);
  const text = await list.text();
  expect(list.status).toBe(200); expect(text).not.toContain('passwordHash'); expect(text).not.toContain('tokenHash');
});
it('rejects stale review and permits only one concurrent revoke, immediately removing access', async () => {
  const url = `/api/admin/memberships/${membershipId}/review`;
  expect((await post(url, review, adminCookie)).status).toBe(409);
  const body = { action: 'revoke', version: 2, reason: 'Synthetic revoke test, no real account.' };
  const responses = await Promise.all([post(url, body, adminCookie), post(url, body, adminCookie)]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
  expect((await get('/app/academy', memberCookie)).status).toBe(307);
  const events = await db.auditEvent.findMany({ where: { targetId: memberId, action: { in: ['MEMBERSHIP_APPROVED','MEMBERSHIP_REVOKED'] } } });
  expect(events.map(e => e.action).sort()).toEqual(['MEMBERSHIP_APPROVED','MEMBERSHIP_REVOKED']);
});
it('supports resubmission and rejection while refusing stale requests and self-approval', async () => {
  expect((await post('/api/membership/request', claim, memberCookie)).status).toBe(409);
  expect((await post('/api/membership/request', { ...claim, version: 3 }, memberCookie)).status).toBe(200);
  expect((await post(`/api/admin/memberships/${membershipId}/review`, { action: 'reject', version: 4, reason: 'Synthetic evidence could not be verified.' }, adminCookie)).status).toBe(200);
  const own = await get('/api/membership/me', memberCookie);
  expect((await own.json()).membership.status).toBe('REJECTED');
  expect((await db.user.findUniqueOrThrow({ where: { id: memberId } })).role).toBe('MEMBER');
});
it('blocks an administrator reviewing their own membership', async () => {
  const admin = await db.user.findUniqueOrThrow({ where: { email: adminEmail } });
  const own = await db.membership.create({ data: { userId: admin.id, status: 'PENDING', brokerName: 'JUSTMARKET', ibCode: 'jai4w0w6', claimedDepositCents: 10000 } });
  expect((await post(`/api/admin/memberships/${own.id}/review`, { ...review, version: 0 }, adminCookie)).status).toBe(403);
  expect((await db.membership.findUniqueOrThrow({ where: { id: own.id } })).status).toBe('PENDING');
});
it('invalidates existing reset tokens as well as sessions during local admin password rotation', async () => {
  const admin = await db.user.findUniqueOrThrow({ where: { email: adminEmail } });
  const token = newToken();
  await db.passwordReset.create({ data: { userId: admin.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 60000) } });
  const rotatedPassword = 'Rotated test admin passphrase only!';
  const result = spawnSync(process.execPath, ['scripts/bootstrap-admin.mjs'], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test', LOCAL_ADMIN_USERNAME: tag.toUpperCase(), LOCAL_ADMIN_EMAIL: adminEmail, LOCAL_ADMIN_PASSWORD: rotatedPassword } });
  expect(result.status).toBe(0);
  expect((await post('/api/auth/reset-password', { token, password })).status).toBe(400);
  expect((await get('/admin', adminCookie)).status).toBe(307);
  expect((await post('/api/auth/login', { username: tag.toUpperCase(), password: rotatedPassword })).status).toBe(200);
});
