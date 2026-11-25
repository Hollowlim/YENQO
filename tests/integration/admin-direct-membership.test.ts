import { beforeAll, afterAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { newToken, digestToken } from '../../apps/web/server/security.js';
const db = new PrismaClient(), base = process.env.APP_ORIGIN!;
const prefix = `direct-membership-${Date.now()}`;
let admin = '', member = '', memberId = '', membershipId = '', adminId = '';
const post = (data: unknown, cookie = admin) => fetch(`${base}/api/admin/memberships/${membershipId}/review`, { method: 'POST', headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const approved = (version: number) => ({ action: 'approve', version, profileVersion: 0, verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositAmount: '100', verifiedAccountSuffix: '3456', confirmed: true });
beforeAll(async () => {
  for (const role of ['ADMIN','MEMBER'] as const) {
    const user = await db.user.create({ data: { name: prefix, email: `${prefix}-${role}@example.test`, role, passwordHash: 'test-no-login', ...(role === 'MEMBER' ? { brokerName: 'JUSTMARKET', mt5Account: '00123456', membership: { create: { status: 'FREE' } } } : {}) } });
    const token = newToken(); await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now()+600000) } });
    const cookie = `__Host-yengfx_session=${token}; yengfx_session=${token}`;
    if (role === 'ADMIN') { admin = cookie; adminId = user.id; } else { member = cookie; memberId = user.id; membershipId = (await db.membership.findUniqueOrThrow({ where: { userId: user.id } })).id; }
  }
});
afterAll(async () => { await db.user.deleteMany({ where: { email: { startsWith: prefix } } }); await db.$disconnect(); });
it('lists a new free registration for admin approval without a member request', async () => {
  const data = await (await fetch(base + '/api/admin/memberships', { headers: { Cookie: admin } })).json();
  expect(data.memberships.some((m: {id: string}) => m.id === membershipId)).toBe(true);
});
it('requires independent IB/deposit confirmation and denies member self-approval', async () => {
  expect((await post(approved(0), member)).status).toBe(403);
  expect((await post({ ...approved(0), confirmed: false })).status).toBe(400);
  expect((await post({ ...approved(0), verifiedDepositAmount: '99' })).status).toBe(400);
  expect((await post({ ...approved(0), profileVersion: 99 })).status).toBe(409);
  expect((await post({ ...approved(0), verifiedAccountSuffix: '9999' })).status).toBe(400);
  expect((await post(approved(0))).status).toBe(200);
  expect((await (await fetch(base + '/api/membership/me', { headers: { Cookie: member } })).json()).fullAccess).toBe(true);
});
it('revokes for MC, audits the reason and allows reapproval after a fresh check', async () => {
  expect((await post({ action: 'revoke', version: 1, reasonCode: 'MC' })).status).toBe(400);
  expect((await post({ action: 'revoke', version: 1, reasonCode: 'MC', reason: 'short' })).status).toBe(400);
  expect((await post({ action: 'revoke', version: 1, reasonCode: 'MC', reason: 'MC / account blown after admin review.' })).status).toBe(200);
  expect((await (await fetch(base + '/api/membership/me', { headers: { Cookie: member } })).json()).fullAccess).toBe(false);
  const event = await db.auditEvent.findFirstOrThrow({ where: { actorId: adminId, targetId: memberId, action: 'MEMBERSHIP_REVOKED' } });
  expect(event.details).toMatchObject({ reasonCode: 'MC' });
  expect((await post(approved(2))).status).toBe(200);
  expect((await post({ action: 'revoke', version: 3, reasonCode: 'IB_CHANGED', reason: 'Client changed IB after independent admin review.' })).status).toBe(200);
  expect((await db.membership.findUniqueOrThrow({ where: { id: membershipId } })).status).toBe('REVOKED');
});
it('permits only one simultaneous reapproval for the same revoked revision', async () => {
  const results = await Promise.all([post(approved(4)), post(approved(4))]);
  expect(results.map(response => response.status).sort()).toEqual([200,409]);
  const state = await db.membership.findUniqueOrThrow({ where: { id: membershipId } });
  expect(state.version).toBe(5); expect(state.status).toBe('APPROVED');
});
