import {archivedController} from '../support/archived-controller';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { digestToken, newToken } from '../../apps/web/server/security.js';
const db = new PrismaClient();
const base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const prefix = `community-${Date.now()}`;
let free = '', member = '', other = '', admin = '', memberId = '', adminId = '', messageId = '';
const get = (route: string, cookie = '') => archivedController(base + route, { headers: { Cookie: cookie }, redirect: 'manual' });
const post = (route: string, data: unknown, cookie = '', origin = base) => archivedController(base + route, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
beforeAll(async () => {
  await db.rateLimit.deleteMany();
  const create = async (name: string, role: 'MEMBER' | 'ADMIN' = 'MEMBER') => {
    const user = await db.user.create({ data: { name, email: `${prefix}-${name}@example.test`, role, passwordHash: 'synthetic-no-password-login' } });
    const token = newToken();
    await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    return { id: user.id, cookie: `__Host-yengfx_session=${token}; yengfx_session=${token}` };
  };
  const a = await create('admin', 'ADMIN'); admin = a.cookie; adminId = a.id;
  const f = await create('free'); free = f.cookie;
  const m = await create('member'); member = m.cookie; memberId = m.id;
  const o = await create('other'); other = o.cookie;
  await db.membership.create({ data: { userId: memberId, status: 'APPROVED', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedById: adminId, verifiedAt: new Date(), reviewReason: 'Synthetic test fixture, not broker verification.' } });
});
afterAll(async () => { await db.user.deleteMany({ where: { email: { startsWith: prefix } } }); await db.$disconnect(); });

it('requires authentication and permits free members to read and post', async () => {
  expect((await get('/api/community/messages')).status).toBe(401);
  const response = await get('/api/community/messages', free);
  expect(response.status).toBe(200); expect((await response.json()).canPost).toBe(true);
  expect((await post('/api/community/messages', { text: 'Free member discussion', clientKey: randomUUID() }, free)).status).toBe(201);
  expect((await fetch(base+'/app/community',{headers:{Cookie:free}})).status).toBe(404);
});
it('posts as the principal, prevents duplicate sends and conflicting replays', async () => {
  const data = { text: '<script>alert(1)</script> Synthetic mapping discussion', chartUrl: 'https://www.tradingview.com/chart/', clientKey: randomUUID(), authorId: adminId };
  const first = await post('/api/community/messages', data, member); expect(first.status).toBe(201);
  const item = (await first.json()).message; messageId = item.id; expect(item.author.id).toBe(memberId);
  const duplicate = await post('/api/community/messages', data, member); expect(duplicate.status).toBe(200); expect((await duplicate.json()).message.id).toBe(messageId);
  expect((await post('/api/community/messages', { ...data, text: 'changed' }, member)).status).toBe(409);
  const history = await (await get('/api/community/messages', free)).json();
  const found = history.messages.find((m: {id: string}) => m.id === messageId);
  expect(found.text).toBe(data.text); expect(found.author.email).toBeUndefined(); expect(found.clientKey).toBeUndefined();
});
it('enforces origin, content bounds, safe chart links and valid reply targets', async () => {
  expect((await post('/api/community/messages', { text: 'blocked', clientKey: randomUUID() }, member, 'https://evil.test')).status).toBe(403);
  for (const patch of [{ text: 'x'.repeat(2001) }, { chartUrl: 'javascript:alert(1)' }, { replyToId: 'missing' }, { chartUrl: 'https://user:password@example.test/' }]) {
    expect([400, 404]).toContain((await post('/api/community/messages', { text: 'Synthetic test', clientKey: randomUUID(), ...patch }, admin)).status);
  }
});
it('supports replies, reports and admin-only report review without cross-user removal', async () => {
  expect((await post(`/api/community/messages/${messageId}/remove`, { reason: 'cross-user attempt' }, other)).status).toBe(403);
  expect((await post('/api/community/messages', { text: 'Synthetic admin reply', clientKey: randomUUID(), replyToId: messageId }, admin)).status).toBe(201);
  expect((await post(`/api/community/messages/${messageId}/report`, { reason: 'Synthetic report for test moderation' }, free)).status).toBe(201);
  expect((await get('/api/community/reports', free)).status).toBe(403);
  const reports = await get('/api/community/reports', admin); expect(reports.status).toBe(200);
  expect((await reports.json()).reports.some((r: {messageId: string}) => r.messageId === messageId)).toBe(true);
});
it('hides content and chart URLs globally and audits moderator removal', async () => {
  expect((await post(`/api/community/messages/${messageId}/remove`, { reason: 'Synthetic test moderation' }, admin)).status).toBe(200);
  const history = await (await get('/api/community/messages', free)).json();
  const removed = history.messages.find((m: {id: string}) => m.id === messageId);
  expect(removed.text).toBeNull(); expect(removed.chartUrl).toBeNull(); expect(removed.removed).toBe(true);
  expect(await db.auditEvent.count({ where: { action: 'COMMUNITY_MESSAGE_HIDDEN', targetId: messageId, actorId: adminId } })).toBe(1);
  expect((await post('/api/community/messages', { text: 'reply to removed', clientKey: randomUUID(), replyToId: messageId }, admin)).status).toBe(404);
});
it('allows own removal and safely deduplicates concurrent retries', async () => {
  const data = { text: 'Concurrent synthetic delivery', clientKey: randomUUID() };
  const responses = await Promise.all([post('/api/community/messages', data, member), post('/api/community/messages', data, member)]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 201]);
  const first = (await responses[0].json()).message, second = (await responses[1].json()).message;
  expect(first.id).toBe(second.id);
  expect(await db.auditEvent.count({ where: { action: 'COMMUNITY_MESSAGE_POSTED', targetId: first.id } })).toBe(1);
  expect((await post(`/api/community/messages/${first.id}/remove`, { reason: 'Removing my synthetic test message' }, member)).status).toBe(200);
  const replay = await (await post('/api/community/messages', data, member)).json();
  expect(replay.message.text).toBeNull(); expect(replay.message.removed).toBe(true);
});
it('paginates without duplicates and rejects malformed cursors and oversized bodies', async () => {
  await db.communityMessage.createMany({ data: Array.from({ length: 55 }, (_, index) => ({ authorId: memberId, clientKey: randomUUID(), text: `${prefix} pagination fixture ${index}` })) });
  try {
    const first = await (await get('/api/community/messages', free)).json();
    expect(first.messages).toHaveLength(50); expect(first.nextCursor).toBeTruthy();
    const second = await (await get(`/api/community/messages?before=${first.nextCursor}`, free)).json();
    const ids = [...first.messages, ...second.messages].map((m: {id: string}) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect((await get('/api/community/messages?before=missing', free)).status).toBe(400);
    expect((await post('/api/community/messages', { text: 'x'.repeat(10000), clientKey: randomUUID() }, admin)).status).toBe(413);
  } finally { await db.communityMessage.deleteMany({ where: { text: { startsWith: `${prefix} pagination fixture` } } }); }
});
it('rate-limits new messages without inserting the rejected post', async () => {
  await db.rateLimit.deleteMany({ where: { key: `community:post:${digestToken(adminId)}` } });
  for (let index = 0; index < 6; index++) expect((await post('/api/community/messages', { text: `${prefix} post limit ${index}`, clientKey: randomUUID() }, admin)).status).toBe(201);
  const clientKey = randomUUID();
  expect((await post('/api/community/messages', { text: 'Rejected seventh synthetic message', clientKey }, admin)).status).toBe(429);
  expect(await db.communityMessage.count({ where: { authorId: adminId, clientKey } })).toBe(0);
});
it('retains regular Community posting and reading after premium approval is revoked', async () => {
  await db.membership.update({ where: { userId: memberId }, data: { status: 'REVOKED' } });
  expect((await post('/api/community/messages', { text: 'revoked posting', clientKey: randomUUID() }, member)).status).toBe(201);
  expect((await get('/api/community/messages', member)).status).toBe(200);
});
