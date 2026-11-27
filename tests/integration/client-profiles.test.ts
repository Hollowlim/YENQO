import { beforeAll, afterAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { digestToken, newToken } from '../../apps/web/server/security.js';
const db = new PrismaClient(), base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const prefix = `profiles-${Date.now()}`;
let member = '', other = '', admin = '', memberId = '';
const get = (path: string, cookie = '') => fetch(base + path, { headers: { Cookie: cookie } });
const post = (data: unknown, cookie = member, origin = base) => fetch(base + '/api/profile', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
beforeAll(async () => {
  for (const name of ['member', 'other', 'admin']) {
    const user = await db.user.create({ data: { name: prefix + name, email: `${prefix}-${name}@example.test`, role: name === 'admin' ? 'ADMIN' : 'MEMBER', passwordHash: 'synthetic-no-login' } });
    const token = newToken(); await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    const cookie = `__Host-yengfx_session=${token}; yengfx_session=${token}`;
    if (name === 'member') { member = cookie; memberId = user.id; } else if (name === 'admin') admin = cookie; else other = cookie;
  }
});
afterAll(async () => { await db.user.deleteMany({ where: { email: { startsWith: prefix } } }); await db.$disconnect(); });
it('requires authentication and keeps the client directory admin-only', async () => {
  expect((await get('/api/profile')).status).toBe(401);
  expect((await get('/api/admin/clients', member)).status).toBe(403);
  expect((await get('/api/admin/clients', admin)).status).toBe(200);
});
it('saves only the principal profile and preserves account numbers as strings', async () => {
  const data = { version: 0, brokerName: 'JUSTMARKET', mt5Account: '00123456', mt5Server: 'Synthetic-Demo', userId: 'forged', role: 'ADMIN' };
  expect((await post(data)).status).toBe(200);
  const own = (await (await get('/api/profile', member)).json()).profile;
  expect(own.mt5Account).toBe('00123456'); expect(own.passwordHash).toBeUndefined();
  const different = (await (await get(`/api/profile?userId=${memberId}`, other)).json()).profile;
  expect(different.mt5Account).toBeNull();
  expect((await db.user.findUniqueOrThrow({ where: { id: memberId } })).role).toBe('MEMBER');
  expect((await post(data)).status).toBe(409);
});
it('validates account details, blocks CSRF and returns a safe admin projection', async () => {
  expect((await post({ version: 1, brokerName: 'JUSTMARKET', mt5Account: 'abc' })).status).toBe(400);
  expect((await post({ version: 1, brokerName: 'JUSTMARKET', mt5Account: '' })).status).toBe(400);
  expect((await post({ version: 1 }, member, 'https://evil.test')).status).toBe(403);
  const result = await (await get(`/api/admin/clients?search=${prefix}`, admin)).json();
  const client = result.clients.find((row: { id: string }) => row.id === memberId);
  expect(client.mt5Account).toBe('00123456'); expect(client.brokerName).toBe('JUSTMARKET');
  expect(client.passwordHash).toBeUndefined(); expect(client.sessions).toBeUndefined();
});
it('keeps a paid plan when broker or MT5 details change', async () => {
  const reviewer = await db.user.findFirstOrThrow({ where: { email: `${prefix}-admin@example.test` } });
  await db.membership.create({ data: { userId: memberId, status: 'APPROVED', plan: 'LIFETIME', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedById: reviewer.id, verifiedAt: new Date() } });
  const saved = await post({ version: 1, brokerName: 'JUSTMARKET', mt5Account: '00987654', mt5Server: 'Synthetic-Demo' });
  expect(saved.status).toBe(200); expect((await saved.json()).reviewRequired).toBe(false);
  const membership = await db.membership.findUniqueOrThrow({ where: { userId: memberId } });
  expect(membership.plan).toBe('LIFETIME'); expect(membership.status).toBe('APPROVED');
});
it('updates only the principal display name without revoking an unchanged verified account', async () => {
  const reviewer = await db.user.findFirstOrThrow({where:{email:`${prefix}-admin@example.test`}});
  await db.membership.update({where:{userId:memberId},data:{status:'APPROVED',plan:'LIFETIME',verifiedBroker:'JUSTMARKET',verifiedIbCode:'jai4w0w6',verifiedDepositCents:10000,verifiedById:reviewer.id,verifiedAt:new Date()}});
  const previous = await db.user.findUniqueOrThrow({where:{id:memberId}});
  const data = {version:previous.profileVersion,name:'Updated synthetic display name',brokerName:previous.brokerName,mt5Account:previous.mt5Account,mt5Server:previous.mt5Server,userId:reviewer.id,email:'forged@example.test'};
  expect((await post({...data,name:'x'})).status).toBe(400);
  const result = await post(data); expect(result.status).toBe(200); expect((await result.json()).reviewRequired).toBe(false);
  const next = await db.user.findUniqueOrThrow({where:{id:memberId}}); expect(next.name).toBe('Updated synthetic display name'); expect(next.email).toBe(previous.email);
  expect((await db.membership.findUniqueOrThrow({where:{userId:memberId}})).status).toBe('APPROVED');
  expect((await db.user.findUniqueOrThrow({where:{id:reviewer.id}})).name).not.toBe(next.name);
  expect((await post(data)).status).toBe(409);
});
