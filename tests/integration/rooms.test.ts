import { beforeAll, afterAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { digestToken, newToken } from '../../apps/web/server/security.js';
import { roomsApi } from '../../apps/web/server/rooms-routes.js';

// Calls the handler in-process against the isolated local test database.
const db = new PrismaClient();
const base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const prefix = `rooms-${Date.now()}`;
const users: Record<string, { id: string; cookie: string }> = {};
const call = (path: string, cookie = '', body?: unknown, origin = base) => roomsApi(new Request(base + path, body === undefined ? { headers: { Cookie: cookie } } : { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
const json = async (response: Response) => ({ status: response.status, body: await response.json() });

beforeAll(async () => {
  await db.rateLimit.deleteMany();
  for (const [name, role] of [['admin', 'ADMIN'], ['mentor', 'MEMBER'], ['member', 'MEMBER'], ['outsider', 'MEMBER'], ['invitee', 'MEMBER'], ['late', 'MEMBER']] as const) {
    const user = await db.user.create({ data: { name: `Rooms ${name}`, email: `${prefix}-${name}@example.test`, role, passwordHash: 'synthetic-no-password-login', mt5Account: '12345678', brokerName: 'SYNTHETIC' } });
    const token = newToken();
    await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    users[name] = { id: user.id, cookie: `__Host-yengfx_session=${token}; yengfx_session=${token}` };
  }
});
afterAll(async () => {
  const ids = Object.values(users).map(user => user.id);
  await db.auditEvent.deleteMany({ where: { actorId: { in: ids } } });
  await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await db.$disconnect();
});

let publicRoom = '', privateRoom = '';
it('lets only admin-approved mentors create rooms', async () => {
  expect((await call('/api/rooms')).status).toBe(401);
  expect((await call('/api/rooms', users.mentor.cookie, { title: 'Gold basics', visibility: 'PUBLIC' })).status).toBe(403);
  expect((await call('/api/admin/mentors', users.member.cookie, { email: `${prefix}-mentor@example.test`, approved: true })).status).toBe(403);
  expect((await call('/api/admin/mentors', users.admin.cookie, { email: `${prefix}-mentor@example.test`, approved: true }, 'https://evil.example')).status).toBe(403);
  expect((await call('/api/admin/mentors', users.admin.cookie, { email: `${prefix}-mentor@example.test`, approved: true })).status).toBe(200);
  expect((await call('/api/admin/mentors', users.admin.cookie, { email: `${prefix}-admin@example.test`, approved: true })).status).toBe(404);
  expect((await call('/api/rooms', users.admin.cookie, { title: 'Admin room', visibility: 'PUBLIC' })).status).toBe(403);
  const created = await json(await call('/api/rooms', users.mentor.cookie, { title: 'Gold basics', description: 'Open study room', visibility: 'PUBLIC' }));
  expect(created.status).toBe(201); publicRoom = created.body.id;
  privateRoom = (await json(await call('/api/rooms', users.mentor.cookie, { title: 'Inner circle', visibility: 'PRIVATE' }))).body.id;
  expect((await call('/api/rooms', users.mentor.cookie, { title: 'x', visibility: 'SECRET' })).status).toBe(400);
  expect(await db.auditEvent.count({ where: { actorId: users.mentor.id, action: 'ROOM_CREATED' } })).toBe(2);
  expect(await db.auditEvent.count({ where: { actorId: users.admin.id, action: 'MENTOR_APPROVED', targetId: users.mentor.id } })).toBe(1);
});

it('hides private rooms from non-members and routes joins through approval', async () => {
  const listed = (await json(await call('/api/rooms', users.outsider.cookie))).body.rooms.map((room: { id: string }) => room.id);
  expect(listed).toContain(publicRoom); expect(listed).not.toContain(privateRoom);
  expect((await call(`/api/rooms/${privateRoom}`, users.outsider.cookie)).status).toBe(404);
  const preview = (await json(await call(`/api/rooms/${publicRoom}`, users.outsider.cookie))).body;
  expect(preview.messages).toEqual([]); expect(preview.members).toEqual([]);
  expect((await json(await call(`/api/rooms/${publicRoom}/join`, users.member.cookie, {}))).body.status).toBe('JOINED');
  expect((await json(await call(`/api/rooms/${privateRoom}/join`, users.outsider.cookie, {}))).body.status).toBe('PENDING');
  expect((await call(`/api/rooms/${privateRoom}`, users.outsider.cookie)).status).toBe(404);
  expect((await call(`/api/rooms/${privateRoom}/requests/${users.outsider.id}`, users.member.cookie, { decision: 'APPROVE' })).status).toBe(404);
  expect((await call(`/api/rooms/${privateRoom}/requests/${users.outsider.id}`, users.mentor.cookie, { decision: 'APPROVE' })).status).toBe(200);
  expect((await call(`/api/rooms/${privateRoom}`, users.outsider.cookie)).status).toBe(200);
});

it('issues hashed, revocable, expiring invitation links', async () => {
  expect((await call(`/api/rooms/${privateRoom}/invites`, users.outsider.cookie, { expiresInHours: 24 })).status).toBe(403);
  const invite = (await json(await call(`/api/rooms/${privateRoom}/invites`, users.mentor.cookie, { expiresInHours: 24 }))).body;
  const token = new URL(invite.url, base).searchParams.get('invite')!;
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const stored = await db.roomInvite.findUniqueOrThrow({ where: { id: invite.id } });
  expect(stored.tokenHash).toBe(digestToken(token)); expect(JSON.stringify(stored)).not.toContain(token);
  expect((await call('/api/rooms/invite', users.invitee.cookie, { invite: newToken() })).status).toBe(404);
  expect((await json(await call('/api/rooms/invite', users.invitee.cookie, { invite: token }))).body.roomId).toBe(privateRoom);
  expect((await call(`/api/rooms/${privateRoom}/invites/${invite.id}/revoke`, users.mentor.cookie, {})).status).toBe(200);
  expect((await call('/api/rooms/invite', users.late.cookie, { invite: token })).status).toBe(404);
  const expiring = (await json(await call(`/api/rooms/${privateRoom}/invites`, users.mentor.cookie, { expiresInHours: 1 }))).body;
  await db.roomInvite.update({ where: { id: expiring.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  expect((await call('/api/rooms/invite', users.late.cookie, { invite: new URL(expiring.url, base).searchParams.get('invite') })).status).toBe(404);
});

it('enforces message roles, idempotency and HTTPS-only chart links', async () => {
  const clientKey = randomUUID();
  const first = await call(`/api/rooms/${publicRoom}/messages`, users.member.cookie, { text: 'Where is support today?', clientKey, chartUrl: 'https://www.tradingview.com/chart/' });
  expect(first.status).toBe(201);
  expect((await call(`/api/rooms/${publicRoom}/messages`, users.member.cookie, { text: 'Where is support today?', clientKey, chartUrl: 'https://www.tradingview.com/chart/' })).status).toBe(200);
  expect((await call(`/api/rooms/${publicRoom}/messages`, users.member.cookie, { text: 'changed', clientKey })).status).toBe(409);
  expect((await call(`/api/rooms/${publicRoom}/messages`, users.member.cookie, { text: 'x', clientKey: randomUUID(), chartUrl: 'http://insecure.example/chart' })).status).toBe(400);
  expect((await call(`/api/rooms/${publicRoom}/messages`, users.member.cookie, { text: 'Big news', kind: 'ANNOUNCEMENT', clientKey: randomUUID() })).status).toBe(403);
  expect((await call(`/api/rooms/${publicRoom}/messages`, users.late.cookie, { text: 'not a member', clientKey: randomUUID() })).status).toBe(403);
  const announcement = (await json(await call(`/api/rooms/${publicRoom}/messages`, users.mentor.cookie, { text: 'Session plan pinned', kind: 'ANNOUNCEMENT', clientKey: randomUUID() }))).body.message;
  expect(announcement.pinned).toBe(true);
  const memberMessage = (await json(first)).body.message;
  expect((await call(`/api/rooms/${publicRoom}/messages/${announcement.id}/hide`, users.member.cookie, {})).status).toBe(403);
  expect((await call(`/api/rooms/${publicRoom}/messages/${memberMessage.id}/pin`, users.member.cookie, {})).status).toBe(403);
  expect((await call(`/api/rooms/${privateRoom}/messages/${memberMessage.id}/hide`, users.mentor.cookie, {})).status).toBe(404);
  expect((await call(`/api/rooms/${publicRoom}/messages/${memberMessage.id}/hide`, users.member.cookie, {})).status).toBe(200);
});

it('never exposes member account data to mentors and limits member management by role', async () => {
  const detail = (await json(await call(`/api/rooms/${publicRoom}`, users.mentor.cookie))).body;
  const raw = JSON.stringify(detail);
  for (const secret of ['@example.test', '12345678', 'SYNTHETIC', 'passwordHash', 'membership']) expect(raw).not.toContain(secret);
  for (const member of detail.members) expect(Object.keys(member.user).sort()).toEqual(['id', 'name']);
  await call(`/api/rooms/${publicRoom}/join`, users.outsider.cookie, {});
  expect((await call(`/api/rooms/${publicRoom}/members/${users.outsider.id}`, users.member.cookie, { action: 'PROMOTE' })).status).toBe(403);
  expect((await call(`/api/rooms/${publicRoom}/members/${users.member.id}`, users.mentor.cookie, { action: 'PROMOTE' })).status).toBe(200);
  expect((await call(`/api/rooms/${publicRoom}/members/${users.mentor.id}`, users.member.cookie, { action: 'REMOVE' })).status).toBe(403);
  expect((await call(`/api/rooms/${publicRoom}/members/${users.outsider.id}`, users.member.cookie, { action: 'REMOVE' })).status).toBe(200);
  expect((await call(`/api/rooms/${publicRoom}/leave`, users.mentor.cookie, {})).status).toBe(409);
});

it('lets administrators archive rooms, which closes them to members', async () => {
  expect((await call('/api/admin/rooms', users.member.cookie)).status).toBe(403);
  expect((await call(`/api/admin/rooms/${publicRoom}/archive`, users.admin.cookie, { archived: true })).status).toBe(200);
  expect((await call(`/api/rooms/${publicRoom}`, users.member.cookie)).status).toBe(404);
  expect((await json(await call('/api/rooms', users.member.cookie))).body.rooms.map((room: { id: string }) => room.id)).not.toContain(publicRoom);
  expect((await json(await call('/api/admin/rooms', users.admin.cookie))).body.rooms.some((room: { id: string; archivedAt: string | null }) => room.id === publicRoom && room.archivedAt)).toBe(true);
});
