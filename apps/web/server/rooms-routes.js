import { z } from 'zod';
import { db } from './db.js';
import { currentUser } from './auth.js';
import { digestToken, isSameOrigin, newToken } from './security.js';
import { jsonResponse } from './http.js';
import { takeRateLimit } from './rate-limit.js';
import { readBoundedJson } from './request-body.js';

const chart = z.string().max(1000).url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'Use an HTTPS chart link without credentials.');
const schemas = {
  create: z.object({ title: z.string().trim().min(3).max(80), description: z.string().trim().max(500).default(''), visibility: z.enum(['PUBLIC', 'PRIVATE']) }).strict(),
  post: z.object({ text: z.string().trim().min(1).max(2000), kind: z.enum(['MESSAGE', 'ANALYSIS', 'ANNOUNCEMENT']).default('MESSAGE'), chartUrl: chart.nullable().optional(), clientKey: z.uuid() }).strict(),
  invite: z.object({ expiresInHours: z.number().int().min(1).max(720).nullable().default(null) }).strict(),
  token: z.object({ invite: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict(),
  member: z.object({ action: z.enum(['PROMOTE', 'DEMOTE', 'REMOVE']) }).strict(),
  decision: z.object({ decision: z.enum(['APPROVE', 'DECLINE']) }).strict(),
  archive: z.object({ archived: z.boolean() }).strict(),
  mentor: z.object({ email: z.string().trim().toLowerCase().email().max(254), approved: z.boolean() }).strict(),
};
// Room payloads expose only id and display name: never email, broker, MT5 or membership fields.
const person = { select: { id: true, name: true } };
const STAFF = ['OWNER', 'MODERATOR'];
const messageSelect = { id: true, authorId: true, kind: true, text: true, chartUrl: true, pinnedAt: true, hiddenAt: true, createdAt: true, author: person };
const publicMessage = m => ({ id: m.id, kind: m.kind, text: m.hiddenAt ? null : m.text, chartUrl: m.hiddenAt ? null : m.chartUrl, pinned: Boolean(m.pinnedAt), removed: Boolean(m.hiddenAt), createdAt: m.createdAt, author: m.author });
const say = (text, status = 200) => jsonResponse({ message: text }, status);
const audit = (tx, actorId, action, targetId, details) => tx.auditEvent.create({ data: { actorId, action, targetId, ...(details ? { details } : {}) } });
const parse = async (request, schema) => schema.safeParse(await readBoundedJson(request.body, 8192));

async function roomDetail(room, user, membership) {
  const staff = STAFF.includes(membership?.role);
  const [messages, members, requests, invites] = await Promise.all([
    // shortcut: latest 100 messages only, add cursor paging when rooms get busy.
    db.roomMessage.findMany({ where: { roomId: room.id }, select: messageSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }),
    db.roomMember.findMany({ where: { roomId: room.id }, select: { role: true, joinedAt: true, user: person }, orderBy: { joinedAt: 'asc' } }),
    staff ? db.roomJoinRequest.findMany({ where: { roomId: room.id, status: 'PENDING' }, select: { createdAt: true, user: person } }) : [],
    staff ? db.roomInvite.findMany({ where: { roomId: room.id }, select: { id: true, expiresAt: true, revokedAt: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 }) : [],
  ]);
  return { room: { id: room.id, title: room.title, description: room.description, visibility: room.visibility, archived: Boolean(room.archivedAt), owner: room.owner }, myRole: membership?.role ?? null, principalId: user.id, messages: messages.reverse().map(publicMessage), members, requests, invites };
}

export async function roomsApi(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!['GET', 'POST'].includes(request.method)) return say('Method not allowed.', 405);
  if (request.method === 'POST' && !isSameOrigin(request.headers.get('origin'), process.env.APP_ORIGIN)) return say('Request origin rejected.', 403);
  try {
    const user = await currentUser(request);
    if (!user) return say('Sign in required.', 401);
    const admin = user.role === 'ADMIN';
    if (!(await takeRateLimit(`rooms:${request.method}`, user.id, request.method === 'GET' ? 120 : 30, 60))) return say('Too many requests. Try again shortly.', 429);

    // ---- Administration: mentor approval and room moderation (no trading authority).
    if (path.startsWith('/api/admin/')) {
      if (!admin) return say('Administrator access required.', 403);
      if (path === '/api/admin/mentors' && request.method === 'GET')
        return jsonResponse({ mentors: await db.user.findMany({ where: { mentorApprovedAt: { not: null } }, select: { id: true, name: true, email: true, mentorApprovedAt: true }, orderBy: { mentorApprovedAt: 'desc' }, take: 200 }) });
      if (path === '/api/admin/mentors' && request.method === 'POST') {
        const parsed = await parse(request, schemas.mentor);
        if (!parsed.success) return say('Provide a member email and an approval decision.', 400);
        const target = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, role: true } });
        if (!target || target.role !== 'MEMBER') return say('No member account uses that email.', 404);
        await db.$transaction(async tx => {
          await tx.user.update({ where: { id: target.id }, data: { mentorApprovedAt: parsed.data.approved ? new Date() : null } });
          await audit(tx, user.id, parsed.data.approved ? 'MENTOR_APPROVED' : 'MENTOR_REVOKED', target.id);
        });
        return say(parsed.data.approved ? 'Mentor approved.' : 'Mentor access revoked.');
      }
      if (path === '/api/admin/rooms' && request.method === 'GET')
        return jsonResponse({ rooms: await db.discussionRoom.findMany({ select: { id: true, title: true, visibility: true, archivedAt: true, createdAt: true, owner: person, _count: { select: { members: true, messages: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }) });
      const archive = path.match(/^\/api\/admin\/rooms\/([a-zA-Z0-9_-]{1,80})\/archive$/)?.[1];
      if (archive && request.method === 'POST') {
        const parsed = await parse(request, schemas.archive);
        if (!parsed.success) return say('Choose archive or restore.', 400);
        const changed = await db.$transaction(async tx => {
          const result = await tx.discussionRoom.updateMany({ where: { id: archive }, data: { archivedAt: parsed.data.archived ? new Date() : null } });
          if (result.count) await audit(tx, user.id, parsed.data.archived ? 'ROOM_ARCHIVED' : 'ROOM_RESTORED', archive);
          return result.count;
        });
        return changed ? say(parsed.data.archived ? 'Room archived.' : 'Room restored.') : say('Room not found.', 404);
      }
      return say('Not found.', 404);
    }

    // ---- Room directory and creation.
    if (path === '/api/rooms' && request.method === 'GET') {
      const rooms = await db.discussionRoom.findMany({
        where: { archivedAt: null, OR: [{ visibility: 'PUBLIC' }, { members: { some: { userId: user.id } } }] },
        select: { id: true, title: true, description: true, visibility: true, owner: person, _count: { select: { members: true } }, members: { where: { userId: user.id }, select: { role: true } }, joinRequests: { where: { userId: user.id }, select: { status: true } } },
        orderBy: { createdAt: 'desc' }, take: 200,
      });
      return jsonResponse({ canCreate: Boolean(user.mentorApprovedAt), rooms: rooms.map(({ members, joinRequests, _count, ...room }) => ({ ...room, memberCount: _count.members, myRole: members[0]?.role ?? null, requestStatus: joinRequests[0]?.status ?? null })) });
    }
    if (path === '/api/rooms' && request.method === 'POST') {
      if (!user.mentorApprovedAt || user.role !== 'MEMBER') return say('Only approved mentors can create rooms.', 403);
      const parsed = await parse(request, schemas.create);
      if (!parsed.success) return say('Use a 3–80 character title, up to 500 characters of description, and public or private access.', 400);
      if (!(await takeRateLimit('rooms:create', user.id, 5, 3600))) return say('Room creation limit reached. Try again later.', 429);
      const room = await db.$transaction(async tx => {
        const created = await tx.discussionRoom.create({ data: { ...parsed.data, ownerId: user.id, members: { create: { userId: user.id, role: 'OWNER' } } }, select: { id: true } });
        await audit(tx, user.id, 'ROOM_CREATED', created.id, { visibility: parsed.data.visibility });
        return created;
      });
      return jsonResponse({ id: room.id }, 201);
    }
    if (path === '/api/rooms/invite' && request.method === 'POST') {
      if (!(await takeRateLimit('rooms:invite-redeem', user.id, 10, 300))) return say('Too many invitation attempts. Try again later.', 429);
      const parsed = await parse(request, schemas.token);
      const invite = parsed.success ? await db.roomInvite.findUnique({ where: { tokenHash: digestToken(parsed.data.invite) }, select: { roomId: true, expiresAt: true, revokedAt: true, room: { select: { archivedAt: true } } } }) : null;
      if (!invite || invite.revokedAt || invite.room.archivedAt || (invite.expiresAt && invite.expiresAt <= new Date())) return say('This invitation is invalid, expired or revoked.', 404);
      await db.$transaction(async tx => {
        await tx.roomMember.upsert({ where: { roomId_userId: { roomId: invite.roomId, userId: user.id } }, create: { roomId: invite.roomId, userId: user.id }, update: {} });
        await tx.roomJoinRequest.deleteMany({ where: { roomId: invite.roomId, userId: user.id } });
        await audit(tx, user.id, 'ROOM_JOINED_BY_INVITE', invite.roomId);
      });
      return jsonResponse({ roomId: invite.roomId });
    }

    // ---- Single room.
    const match = path.match(/^\/api\/rooms\/([a-zA-Z0-9_-]{1,80})(?:\/(join|leave|messages|members|invites|requests)(?:\/([a-zA-Z0-9_-]{1,80})(?:\/(pin|unpin|hide|revoke))?)?)?$/);
    if (!match) return say('Not found.', 404);
    const [, roomId, section, targetId, verb] = match;
    const room = await db.discussionRoom.findUnique({ where: { id: roomId }, select: { id: true, title: true, description: true, visibility: true, archivedAt: true, owner: person } });
    const membership = room ? await db.roomMember.findUnique({ where: { roomId_userId: { roomId, userId: user.id } }, select: { role: true } }) : null;
    // Private rooms are indistinguishable from missing rooms for non-members.
    if (!room || (room.archivedAt && !admin) || (room.visibility === 'PRIVATE' && !membership && !admin && section !== 'join')) return say('Room not found.', 404);
    const staff = STAFF.includes(membership?.role ?? '');

    if (!section && request.method === 'GET') {
      if (!membership && !admin) return jsonResponse({ room: { id: room.id, title: room.title, description: room.description, visibility: room.visibility, owner: room.owner }, myRole: null, messages: [], members: [], requests: [], invites: [] });
      return jsonResponse(await roomDetail(room, user, membership));
    }
    if (request.method !== 'POST') return say('Not found.', 404);

    if (section === 'join' && !targetId) {
      if (membership) return say('You are already a member.');
      if (room.visibility === 'PUBLIC') {
        await db.$transaction(async tx => { await tx.roomMember.upsert({ where: { roomId_userId: { roomId, userId: user.id } }, create: { roomId, userId: user.id }, update: {} }); await audit(tx, user.id, 'ROOM_JOINED', roomId); });
        return jsonResponse({ status: 'JOINED' }, 201);
      }
      await db.roomJoinRequest.upsert({ where: { roomId_userId: { roomId, userId: user.id } }, create: { roomId, userId: user.id }, update: { status: 'PENDING', decidedAt: null, createdAt: new Date() } });
      return jsonResponse({ status: 'PENDING' }, 202);
    }
    if (section === 'leave' && !targetId) {
      if (!membership) return say('You are not a member.', 404);
      if (membership.role === 'OWNER') return say('Room owners cannot leave their own room.', 409);
      await db.roomMember.delete({ where: { roomId_userId: { roomId, userId: user.id } } });
      return say('You left the room.');
    }
    if (section === 'messages' && !targetId) {
      if (!membership) return say('Join the room to post.', 403);
      const parsed = await parse(request, schemas.post);
      if (!parsed.success) return say('Write a message of 1–2000 characters. Chart links must use HTTPS.', 400);
      if (parsed.data.kind !== 'MESSAGE' && !staff) return say('Only room owners and moderators can post announcements or analysis.', 403);
      const data = { ...parsed.data, chartUrl: parsed.data.chartUrl ?? null };
      const existing = await db.roomMessage.findUnique({ where: { authorId_clientKey: { authorId: user.id, clientKey: data.clientKey } }, select: { ...messageSelect, roomId: true } });
      if (existing) return existing.roomId === roomId && existing.text === data.text && existing.kind === data.kind && existing.chartUrl === data.chartUrl ? jsonResponse({ message: publicMessage(existing) }) : say('This request key was already used for different content.', 409);
      if (!(await takeRateLimit('rooms:post', user.id, 10, 60))) return say('Posting limit reached. Wait a minute before posting again.', 429);
      const created = await db.roomMessage.create({ data: { ...data, roomId, authorId: user.id, ...(data.kind === 'ANNOUNCEMENT' ? { pinnedAt: new Date() } : {}) }, select: messageSelect });
      return jsonResponse({ message: publicMessage(created) }, 201);
    }
    if (section === 'messages' && verb) {
      const item = await db.roomMessage.findFirst({ where: { id: targetId, roomId }, select: { authorId: true, hiddenAt: true } });
      if (!item) return say('Message not found.', 404);
      if (verb === 'hide') {
        if (!staff && !admin && item.authorId !== user.id) return say('You can remove only your own messages.', 403);
        await db.$transaction(async tx => { await tx.roomMessage.update({ where: { id: targetId }, data: { hiddenAt: new Date(), pinnedAt: null } }); await audit(tx, user.id, 'ROOM_MESSAGE_HIDDEN', targetId, { roomId }); });
        return say('Message removed.');
      }
      if (!staff) return say('Only room owners and moderators can pin messages.', 403);
      if (item.hiddenAt) return say('Removed messages cannot be pinned.', 409);
      await db.roomMessage.update({ where: { id: targetId }, data: { pinnedAt: verb === 'pin' ? new Date() : null } });
      return say(verb === 'pin' ? 'Message pinned.' : 'Message unpinned.');
    }
    if (section === 'members' && targetId && !verb) {
      const parsed = await parse(request, schemas.member);
      if (!parsed.success) return say('Choose promote, demote or remove.', 400);
      const target = await db.roomMember.findUnique({ where: { roomId_userId: { roomId, userId: targetId } }, select: { role: true } });
      if (!target) return say('Member not found.', 404);
      const { action } = parsed.data;
      const owner = membership?.role === 'OWNER';
      const allowed = target.role !== 'OWNER' && (action === 'REMOVE' ? owner || admin || (staff && target.role === 'MEMBER') : owner);
      if (!allowed) return say('You do not have permission to change this member.', 403);
      await db.$transaction(async tx => {
        if (action === 'REMOVE') await tx.roomMember.delete({ where: { roomId_userId: { roomId, userId: targetId } } });
        else await tx.roomMember.update({ where: { roomId_userId: { roomId, userId: targetId } }, data: { role: action === 'PROMOTE' ? 'MODERATOR' : 'MEMBER' } });
        await audit(tx, user.id, `ROOM_MEMBER_${action}`, targetId, { roomId });
      });
      return say('Member updated.');
    }
    if (section === 'invites' && !targetId) {
      if (!staff) return say('Only room owners and moderators can create invitations.', 403);
      const parsed = await parse(request, schemas.invite);
      if (!parsed.success) return say('Expiry must be 1–720 hours, or none.', 400);
      const token = newToken();
      const expiresAt = parsed.data.expiresInHours ? new Date(Date.now() + parsed.data.expiresInHours * 3600000) : null;
      const invite = await db.$transaction(async tx => {
        const created = await tx.roomInvite.create({ data: { roomId, tokenHash: digestToken(token), createdById: user.id, expiresAt }, select: { id: true } });
        await audit(tx, user.id, 'ROOM_INVITE_CREATED', created.id, { roomId });
        return created;
      });
      // The raw token is returned once and only its hash is stored.
      return jsonResponse({ id: invite.id, url: `/app/rooms?invite=${token}`, expiresAt }, 201);
    }
    if (section === 'invites' && verb === 'revoke') {
      if (!staff) return say('Only room owners and moderators can revoke invitations.', 403);
      const changed = await db.roomInvite.updateMany({ where: { id: targetId, roomId, revokedAt: null }, data: { revokedAt: new Date() } });
      return changed.count ? say('Invitation revoked.') : say('Invitation not found or already revoked.', 404);
    }
    if (section === 'requests' && targetId && !verb) {
      if (!staff) return say('Only room owners and moderators can review join requests.', 403);
      const parsed = await parse(request, schemas.decision);
      if (!parsed.success) return say('Choose approve or decline.', 400);
      const approve = parsed.data.decision === 'APPROVE';
      const done = await db.$transaction(async tx => {
        const changed = await tx.roomJoinRequest.updateMany({ where: { roomId, userId: targetId, status: 'PENDING' }, data: { status: approve ? 'APPROVED' : 'DECLINED', decidedAt: new Date() } });
        if (!changed.count) return false;
        if (approve) await tx.roomMember.upsert({ where: { roomId_userId: { roomId, userId: targetId } }, create: { roomId, userId: targetId }, update: {} });
        await audit(tx, user.id, approve ? 'ROOM_REQUEST_APPROVED' : 'ROOM_REQUEST_DECLINED', targetId, { roomId });
        return true;
      });
      return done ? say(approve ? 'Request approved.' : 'Request declined.') : say('No pending request.', 404);
    }
    return say('Not found.', 404);
  } catch (error) {
    if (error instanceof Error && error.message === 'BODY_TOO_LARGE') return say('Request body too large.', 413);
    if (error instanceof Error && error.message === 'INVALID_JSON') return say('Invalid JSON.', 400);
    return say('Discussion Rooms are temporarily unavailable. Try again shortly.', 503);
  }
}
