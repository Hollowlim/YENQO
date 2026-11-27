import { afterAll, beforeAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { digestToken, newToken } from '../../apps/web/server/security.js';
import { requireLocalTestDatabase } from '../support/test-database';

// This suite never runs against the connected hosted Supabase project.
requireLocalTestDatabase();
const db = new PrismaClient();
const base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const prefix = `v6-dashboard-${Date.now()}`;
let adminCookie = '', memberCookie = '', adminId = '';
const get = (query = '', cookie = adminCookie) => fetch(`${base}/api/admin/dashboard${query}`, { headers: { Cookie: cookie } });

beforeAll(async () => {
  for (const role of ['ADMIN', 'MEMBER'] as const) {
    const user = await db.user.create({ data: { name: `${prefix}-${role}`, email: `${prefix}-${role}@example.test`, role, passwordHash: 'synthetic-no-login' } });
    const token = newToken();
    await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    const cookie = `__Host-yengfx_session=${token}; yengfx_session=${token}`;
    if (role === 'ADMIN') { adminCookie = cookie; adminId = user.id; } else memberCookie = cookie;
  }
});

afterAll(async () => {
  const users = await db.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } });
  await db.auditEvent.deleteMany({ where: { actorId: { in: users.map(user => user.id) } } });
  await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await db.$disconnect();
});

it('requires the authenticated administrator rather than a query-supplied role or user identifier', async () => {
  expect((await get('', '')).status).toBe(401);
  expect((await get(`?userId=${adminId}&role=ADMIN`, memberCookie)).status).toBe(403);
  expect((await get()).status).toBe(200);
});

it('reports actual registration, activity, free trial and paid plan counts', async () => {
  const beforeResponse = await get('?days=7');
  expect(beforeResponse.status).toBe(200);
  const before = await beforeResponse.json();
  for (const [name, plan] of [['free', 'FREE'], ['lifetime', 'LIFETIME'], ['expired', 'MONTHLY']] as const) {
    const user = await db.user.create({ data: {
      name: `${prefix}-${name}`, email: `${prefix}-${name}@example.test`, passwordHash: 'synthetic-no-login',
      ...(name === 'lifetime' ? { lastLoginAt: new Date() } : {}),
    } });
    await db.membership.create({ data: { userId: user.id, plan, ...(name === 'expired' ? { accessUntil: new Date(Date.now() - 86400000) } : {}) } });
  }
  const response = await get('?days=7');
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.source).toBe('application-database');
  expect(Number.isNaN(Date.parse(result.asOf))).toBe(false);
  expect(result.days).toBe(7);
  expect(result.metrics.totalMembers).toBe(before.metrics.totalMembers + 3);
  expect(result.metrics.activeMembers30d).toBe(before.metrics.activeMembers30d + 1);
  expect(result.metrics.paidMembers).toBe(before.metrics.paidMembers + 1);
  expect(result.growth).toHaveLength(7);
  expect(result.growth.reduce((sum: number, row: { registrations: number }) => sum + row.registrations, 0)).toBe(
    before.growth.reduce((sum: number, row: { registrations: number }) => sum + row.registrations, 0) + 3,
  );
  expect(result.distribution.reduce((sum: number, row: { count: number }) => sum + row.count, 0)).toBe(result.metrics.totalMembers);
  expect(result.recentMembers.find((row: { email: string }) => row.email === `${prefix}-lifetime@example.test`)?.status).toBe('Lifetime plan');
  expect(JSON.stringify(result)).not.toContain('passwordHash');
  expect(JSON.stringify(result)).not.toContain('tokenHash');
  expect(result.metrics).not.toHaveProperty('revenue');
});

it('validates chart windows and reports unsupported services without claiming broker connectivity', async () => {
  for (const days of [7, 30, 90, 365]) {
    const response = await get(`?days=${days}`);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.days).toBe(days);
    expect(result.growth).toHaveLength(days);
    expect(result.services).toEqual(expect.any(Array));
    expect(result.services.length).toBeGreaterThan(0);
    for (const service of result.services) {
      if (/MT5|broker|billing|payment|live chat/i.test(service.name)) expect(String(service.status).toLowerCase()).not.toBe('operational');
    }
  }
  for (const days of ['0', '8', 'all', '400']) expect((await get(`?days=${days}`)).status).toBe(400);
});
