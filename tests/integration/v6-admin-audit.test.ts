import { afterAll, beforeAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { digestToken, newToken } from '../../apps/web/server/security.js';
import { requireLocalTestDatabase } from '../support/test-database';

requireLocalTestDatabase();
const db = new PrismaClient();
const base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3117';
const prefix = `v6-audit-${Date.now()}`;
const cookies: Record<string, string> = {};
let adminId = '';
const get = (query = '', cookie = cookies.ADMIN) => fetch(`${base}/api/admin/audit${query}`, { headers: { Cookie: cookie } });

beforeAll(async () => {
  for (const role of ['ADMIN', 'MEMBER'] as const) {
    const user = await db.user.create({ data: { name: `${prefix}-${role}`, email: `${prefix}-${role}@example.test`, role, passwordHash: 'synthetic-no-login' } });
    const token = newToken();
    await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    cookies[role] = `yengfx_session=${token}; __Host-yengfx_session=${token}`;
    if (role === 'ADMIN') adminId = user.id;
  }
});

afterAll(async () => {
  await db.auditEvent.deleteMany({ where: { actorId: adminId } });
  await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await db.$disconnect();
});

it('requires an administrator session and rejects forged role claims and cursors', async () => {
  expect((await get('', '')).status).toBe(401);
  expect((await get('?role=ADMIN', cookies.MEMBER)).status).toBe(403);
  expect((await get('?before=not-a-record')).status).toBe(400);
  expect((await get('?before=%3Cscript%3E')).status).toBe(400);
});

it('paginates stored audit events without returning raw event details or credentials', async () => {
  await db.auditEvent.createMany({ data: Array.from({ length: 55 }, (_, index) => ({ actorId: adminId, action: `${prefix}-${index}`, details: { privateSnapshot: 'must-not-be-returned' } })) });
  const response = await get();
  expect(response.status).toBe(200);
  const first = await response.json();
  expect(first.source).toBe('application-database');
  expect(first.items).toHaveLength(50);
  expect(first.nextCursor).toBe(first.items[49].id);
  expect(first.items.some((item: { action: string }) => item.action.startsWith(prefix))).toBe(true);
  for (const item of first.items) expect(Object.keys(item).sort()).toEqual(['action', 'actorId', 'createdAt', 'id', 'targetId']);
  expect(JSON.stringify(first)).not.toContain('must-not-be-returned');
  const nextResponse = await get(`?before=${first.nextCursor}`);
  expect(nextResponse.status).toBe(200);
  const next = await nextResponse.json();
  expect(next.items.length).toBeGreaterThan(0);
  expect(next.items.some((item: { id: string }) => first.items.some((previous: { id: string }) => previous.id === item.id))).toBe(false);
});
