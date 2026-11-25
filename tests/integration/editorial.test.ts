import {archivedController} from '../support/archived-controller';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { digestToken, newToken } from '../../apps/web/server/security.js';
const db = new PrismaClient(), base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const prefix = `editorial-${Date.now()}`;
const date = '2042-03-18';
let admin = '', member = '', adminId = '', planId = '', signalId = '';
const plan = { planDate: date, title: `${prefix} plan`, description: '<script>synthetic plan</script>', bias: 'BULLISH', status: 'DRAFT', version: 0 };
const signal = { requestKey: randomUUID(), title: `${prefix} signal`, side: 'BUY', category: 'SCALPING', zoneLow: '100', zoneHigh: '108', sl: '98', tp1: '112', tp2: '116', tp3: '120', notes: 'Synthetic prices only, not market data.', status: 'DRAFT', version: 0 };
const get = (path: string, cookie = '') => archivedController(base + path, { headers: { Cookie: cookie } });
const post = (path: string, data: unknown, cookie = '', origin = base) => archivedController(base + path, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
beforeAll(async () => {
  const create = async (name: string, role: 'ADMIN' | 'MEMBER') => {
    const user = await db.user.create({ data: { name, email: `${prefix}-${name}@example.test`, role, passwordHash: 'synthetic-no-password-login' } });
    const token = newToken(); await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    return { id: user.id, cookie: `__Host-yengfx_session=${token}; yengfx_session=${token}` };
  };
  const a = await create('admin', 'ADMIN'); admin = a.cookie; adminId = a.id;
  member = (await create('member', 'MEMBER')).cookie;
});
afterAll(async () => {
  await db.dailyPlan.deleteMany({ where: { title: { startsWith: prefix } } });
  await db.manualSignal.deleteMany({ where: { title: { startsWith: prefix } } });
  await db.user.deleteMany({ where: { email: { startsWith: prefix } } }); await db.$disconnect();
});
it('requires authentication and admin authority for writes', async () => {
  expect((await get('/api/content/analysis')).status).toBe(401);
  expect((await get('/api/admin/analysis', member)).status).toBe(403);
  expect((await post('/api/admin/analysis', plan, member)).status).toBe(403);
  expect((await post('/api/admin/signals', signal, member)).status).toBe(403);
  expect((await post('/api/admin/analysis', plan, admin, 'https://evil.test')).status).toBe(403);
});
it('stores an admin draft without exposing it to a free member', async () => {
  const created = await post('/api/admin/analysis', { ...plan, createdById: 'forged' }, admin); expect(created.status).toBe(201);
  const item = (await created.json()).item; planId = item.id; expect(item.version).toBe(1);
  expect((await db.dailyPlan.findUniqueOrThrow({ where: { id: planId } })).createdById).toBe(adminId);
  expect((await (await get(`/api/content/analysis?date=${date}`, member)).json()).items).toEqual([]);
});
it('publishes all three bias options, tracks revisions and rejects stale edits', async () => {
  let version = 1;
  for (const bias of ['BULLISH', 'BEARISH', 'SIDEWAY']) {
    const saved = await post('/api/admin/analysis', { ...plan, id: planId, bias, status: 'PUBLISHED', version }, admin);
    expect(saved.status).toBe(200); version++;
    const data = await (await get(`/api/content/analysis?date=${date}`, member)).json();
    expect(data.items[0].bias).toBe(bias); expect(data.items[0].description).toBe(plan.description);
    expect(data.items[0].createdById).toBeUndefined(); expect(data.items[0].version).toBe(version);
  }
  expect((await post('/api/admin/analysis', { ...plan, id: planId, status: 'PUBLISHED', version: 1 }, admin)).status).toBe(409);
  expect(await db.auditEvent.count({ where: { actorId: adminId, targetId: planId, action: 'DAILY_PLAN_SAVED' } })).toBe(4);
});
it('validates dates, bias, price bounds and BUY/SELL target ordering', async () => {
  expect((await post('/api/admin/analysis', { ...plan, planDate: '2026-02-31' }, admin)).status).toBe(400);
  expect((await post('/api/admin/analysis', { ...plan, bias: 'UNKNOWN' }, admin)).status).toBe(400);
  for (const patch of [{ sl: '109' }, { tp2: '111' }, { zoneHigh: '90' }, { tp1: '1e5' }, { sl: '-2' }, { side: 'SELL' }, { zoneLow: '100.0001' }]) {
    expect((await post('/api/admin/signals', { ...signal, ...patch, requestKey: randomUUID() }, admin)).status).toBe(400);
  }
});
it('creates a manual signal idempotently and publishes it for free members', async () => {
  const created = await post('/api/admin/signals', signal, admin); expect(created.status).toBe(201);
  signalId = (await created.json()).item.id;
  expect((await post('/api/admin/signals', signal, admin)).status).toBe(200);
  expect((await post('/api/admin/signals', { ...signal, title: 'conflicting retry' }, admin)).status).toBe(409);
  expect((await (await get('/api/content/signals', member)).json()).items.some((item: {id: string}) => item.id === signalId)).toBe(false);
  expect((await post('/api/admin/signals', { ...signal, id: signalId, status: 'PUBLISHED', version: 1 }, admin)).status).toBe(200);
  const result = await (await get('/api/content/signals?category=SCALPING', member)).json();
  const item = result.items.find((row: {id: string}) => row.id === signalId);
  expect(Number(item.zoneLow)).toBe(100); expect(Number(item.tp3)).toBe(120); expect(item.requestKey).toBeUndefined();
});
it('accepts valid SELL levels and rejects an oversized publishing body', async () => {
  expect((await post('/api/admin/signals', { ...signal, requestKey: randomUUID(), side: 'SELL', sl: '110', tp1: '98', tp2: '96', tp3: '90' }, admin)).status).toBe(201);
  expect((await post('/api/admin/analysis', { ...plan, description: 'x'.repeat(40000) }, admin)).status).toBe(413);
});
it('allows only one concurrent edit for each expected revision', async () => {
  const plans = await Promise.all(['one', 'two'].map(suffix => post('/api/admin/analysis', { ...plan, id: planId, version: 4, status: 'PUBLISHED', description: `Synthetic race ${suffix}` }, admin)));
  expect(plans.map(r => r.status).sort()).toEqual([200, 409]);
  const signals = await Promise.all(['one', 'two'].map(suffix => post('/api/admin/signals', { ...signal, id: signalId, version: 2, status: 'PUBLISHED', notes: `Synthetic race ${suffix}` }, admin)));
  expect(signals.map(r => r.status).sort()).toEqual([200, 409]);
  expect((await db.dailyPlan.findUniqueOrThrow({ where: { id: planId } })).version).toBe(5);
  expect((await db.manualSignal.findUniqueOrThrow({ where: { id: signalId } })).version).toBe(3);
});
it('archives published content and removes it from member queries', async () => {
  expect((await post('/api/admin/analysis', { ...plan, id: planId, status: 'ARCHIVED', version: 5 }, admin)).status).toBe(200);
  expect((await post('/api/admin/signals', { ...signal, id: signalId, status: 'ARCHIVED', version: 3 }, admin)).status).toBe(200);
  expect((await (await get(`/api/content/analysis?date=${date}`, member)).json()).items).toEqual([]);
  expect((await (await get('/api/content/signals', member)).json()).items.some((row: {id: string}) => row.id === signalId)).toBe(false);
});
