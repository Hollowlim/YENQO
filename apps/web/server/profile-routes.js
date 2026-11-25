import { z } from 'zod';
import { db } from './db.js';
import { currentUser } from './auth.js';
import { brokerFields, completeBrokerDetails, isSameOrigin } from './security.js';
import { jsonResponse } from './http.js';
import { readBoundedJson } from './request-body.js';
import { takeRateLimit } from './rate-limit.js';
const profileSelect = { id: true, name: true, email: true, brokerName: true, mt5Account: true, mt5Server: true, profileVersion: true };
const schema = z.object({ ...brokerFields, name:z.string().trim().min(2).max(80).optional(), version: z.number().int().min(0) }).refine(completeBrokerDetails);
const message = (message, status) => jsonResponse({ message }, status);
export async function profileApi(request) {
  const url = new URL(request.url), admin = url.pathname === '/api/admin/clients';
  if (request.method === 'POST' && !isSameOrigin(request.headers.get('origin'), process.env.APP_ORIGIN)) return message('Request origin rejected.', 403);
  try {
    const user = await currentUser(request); if (!user) return message('Sign in required.', 401);
    if (admin && user.role !== 'ADMIN') return message('Administrator access required.', 403);
    if (!await takeRateLimit(`profile:${request.method}`, user.id, request.method === 'GET' ? 90 : 20, 60)) return message('Too many requests. Try again shortly.', 429);
    if (admin && request.method === 'GET') {
      const search = (url.searchParams.get('search') ?? '').trim(), before = url.searchParams.get('before');
      if (search.length > 80 || (before && (!/^[a-zA-Z0-9_-]{1,80}$/.test(before) || !await db.user.findFirst({ where: { id: before, role: 'MEMBER' }, select: { id: true } })))) return message('Invalid search or cursor.', 400);
      const clients = await db.user.findMany({ where: { role: 'MEMBER', ...(search ? { OR: ['name', 'email', 'brokerName', 'mt5Account'].map(field => ({ [field]: { contains: search, mode: 'insensitive' } })) } : {}) }, select: { ...profileSelect, createdAt: true, membership: { select: { status: true, verifiedAt: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51, ...(before ? { cursor: { id: before }, skip: 1 } : {}) });
      await db.auditEvent.create({ data: { actorId: user.id, action: 'CLIENT_DIRECTORY_VIEWED', details: { count: Math.min(clients.length, 50) } } });
      return jsonResponse({ clients: clients.slice(0, 50), nextCursor: clients.length > 50 ? clients[49].id : null });
    }
    if (!admin && request.method === 'GET') return jsonResponse({ profile: await db.user.findUniqueOrThrow({ where: { id: user.id }, select: profileSelect }) });
    if (admin || request.method !== 'POST') return message('Not found.', 404);
    const parsed = schema.safeParse(await readBoundedJson(request.body, 8192));
    if (!parsed.success) return message('Use a display name of 2–80 characters. Provide broker and a 4–20 digit MT5 account together, or leave both blank.', 400);
    const { version, ...fields } = parsed.data;
    const details = { brokerName: fields.brokerName || null, mt5Account: fields.mt5Account || null, mt5Server: fields.mt5Server || null, ...(fields.name !== undefined ? {name:fields.name} : {}) };
    const result = await db.$transaction(async tx => {
      const previous = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: profileSelect });
      if (previous.profileVersion !== version) return null;
      const changed = await tx.user.updateMany({ where: { id: user.id, profileVersion: version }, data: { ...details, profileVersion: { increment: 1 } } });
      if (!changed.count) return null;
      let reviewRequired = false;
      if (['brokerName','mt5Account','mt5Server'].some(key => previous[key] !== details[key])) {
        const reset = await tx.membership.updateMany({ where: { userId: user.id, status: { in: ['APPROVED', 'PENDING'] } }, data: { status: 'REVOKED', version: { increment: 1 }, verifiedBroker: null, verifiedIbCode: null, verifiedDepositCents: null, verifiedById: null, verifiedAt: null, reviewReason: 'Broker or MT5 details changed. Submit a new verification request.' } });
        reviewRequired = reset.count > 0;
      }
      await tx.auditEvent.create({ data: { actorId: user.id, targetId: user.id, action: 'CLIENT_PROFILE_UPDATED', details: { reviewRequired, version: version + 1 } } });
      return { profile: await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: profileSelect }), reviewRequired };
    });
    return result ? jsonResponse(result) : message('Your details changed. Reload before saving.', 409);
  } catch (error) {
    if (error instanceof Error && error.message === 'BODY_TOO_LARGE') return message('Request too large.', 413);
    if (error instanceof Error && error.message === 'INVALID_JSON') return message('Invalid JSON.', 400);
    return message('Client details are temporarily unavailable.', 503);
  }
}
