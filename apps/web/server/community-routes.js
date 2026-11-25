import { z } from 'zod';
import { db } from './db.js';
import { currentUser } from './auth.js';
import { isSameOrigin } from './security.js';
import { jsonResponse } from './http.js';
import { takeRateLimit } from './rate-limit.js';
import { readBoundedJson } from './request-body.js';
import { prepareCommunityImage } from './community-images.js';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const chart = z.string().max(1000).url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'Use an HTTPS chart link without credentials.');
const postSchema = z.object({ text: z.string().trim().max(2000), image: z.object({ base64: z.string().max(6990508) }).optional(), chartUrl: chart.nullable().optional(), replyToId: id.nullable().optional(), clientKey: z.uuid() }).refine(data => data.text.length > 0 || Boolean(data.image));
const reasonSchema = z.object({ reason: z.string().trim().min(5).max(500) });
const select = { id: true, authorId: true, text: true, chartUrl: true, imageHash: true, replyToId: true, createdAt: true, hiddenAt: true, author: { select: { id: true, name: true, role: true } } };
const publicMessage = item => ({ id: item.id, text: item.hiddenAt ? null : item.text, chartUrl: item.hiddenAt ? null : item.chartUrl, hasImage: !item.hiddenAt && Boolean(item.imageHash), replyToId: item.replyToId, createdAt: item.createdAt, removed: Boolean(item.hiddenAt), author: item.author });
const message = (text, status = 200) => jsonResponse({ message: text }, status);

export async function communityApi(request) {
  const url = new URL(request.url);
  if (request.method === 'POST' && !isSameOrigin(request.headers.get('origin'), process.env.APP_ORIGIN)) return message('Request origin rejected.', 403);
  try {
    const user = await currentUser(request);
    if (!user) return message('Sign in required.', 401);
    const admin = user.role === 'ADMIN';
    const canPost = true; // Regular Community is open to every authenticated member.
    const imageId = url.pathname.match(/^\/api\/community\/messages\/([a-zA-Z0-9_-]{1,80})\/image$/)?.[1];
    if (!(await takeRateLimit(imageId ? 'community:image' : `community:${request.method}`, user.id, imageId ? 300 : request.method === 'GET' ? 90 : 20, 60))) return message('Too many requests. Try again shortly.', 429);
    if (imageId && ['GET', 'HEAD'].includes(request.method)) {
      const item = await db.communityMessage.findFirst({ where: { id: imageId, hiddenAt: null }, select: { imageData: true } });
      if (!item?.imageData) return message('Image not found.', 404);
      return new Response(request.method === 'HEAD' ? null : item.imageData, { headers: { 'Content-Type': 'image/webp', 'Content-Length': String(item.imageData.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    if (request.method === 'GET' && url.pathname === '/api/community/messages') {
      const before = url.searchParams.get('before');
      if (before && (!id.safeParse(before).success || !await db.communityMessage.findUnique({ where: { id: before }, select: { id: true } }))) return message('Invalid page cursor.', 400);
      const rows = await db.communityMessage.findMany({ select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51, ...(before ? { cursor: { id: before }, skip: 1 } : {}) });
      return jsonResponse({ messages: rows.slice(0, 50).map(publicMessage), nextCursor: rows.length > 50 ? rows[49].id : null, canPost, isAdmin: admin, principalId: user.id });
    }
    if (request.method === 'GET' && url.pathname === '/api/community/reports') {
      if (!admin) return message('Administrator access required.', 403);
      const before = url.searchParams.get('before');
      if (before && (!id.safeParse(before).success || !await db.communityReport.findUnique({ where: { id: before }, select: { id: true } }))) return message('Invalid page cursor.', 400);
      const rows = await db.communityReport.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51, ...(before ? { cursor: { id: before }, skip: 1 } : {}), select: { id: true, messageId: true, reason: true, createdAt: true, reporter: { select: { name: true } }, message: { select } } });
      return jsonResponse({ reports: rows.slice(0, 50).map(row => ({ ...row, message: publicMessage(row.message) })), nextCursor: rows.length > 50 ? rows[49].id : null });
    }
    if (request.method !== 'POST') return message('Not found.', 404);
    if (['/api/community/messages', '/api/community/messages/photo'].includes(url.pathname)) {
      const photo = url.pathname.endsWith('/photo');
      const parsed = postSchema.safeParse(await readBoundedJson(request.body, photo ? 7 * 1024 * 1024 : 8192));
      if (!parsed.success || (photo && !parsed.data.image) || (!photo && parsed.data.image)) return message('Write a message up to 2000 characters or attach one JPG, PNG or WebP image (up to 5 MB).', 400);
      const { image, ...fields } = parsed.data;
      const prepared = image ? await prepareCommunityImage(image.base64) : { imageData: null, imageHash: null };
      const data = { ...fields, ...prepared, chartUrl: parsed.data.chartUrl ?? null, replyToId: parsed.data.replyToId ?? null };
      const ownKey = { authorId_clientKey: { authorId: user.id, clientKey: data.clientKey } };
      const replay = item => item.text === data.text && item.chartUrl === data.chartUrl && item.imageHash === data.imageHash && item.replyToId === data.replyToId ? jsonResponse({ message: publicMessage(item) }) : message('This request key was already used for different content.', 409);
      const existing = await db.communityMessage.findUnique({ where: ownKey, select });
      if (existing) return replay(existing);
      if (!(await takeRateLimit('community:post', user.id, 6, 60))) return message('Posting limit reached. Wait a minute before posting again.', 429);
      try {
        const created = await db.$transaction(async tx => {
          if (data.replyToId && !await tx.communityMessage.findFirst({ where: { id: data.replyToId, hiddenAt: null }, select: { id: true } })) return null;
          const item = await tx.communityMessage.create({ data: { ...data, authorId: user.id }, select });
          await tx.auditEvent.create({ data: { actorId: user.id, targetId: item.id, action: 'COMMUNITY_MESSAGE_POSTED' } });
          return item;
        });
        return created ? jsonResponse({ message: publicMessage(created) }, 201) : message('Reply target is unavailable.', 404);
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
          const duplicate = await db.communityMessage.findUnique({ where: ownKey, select });
          if (duplicate) return replay(duplicate);
        }
        throw error;
      }
    }
    const match = url.pathname.match(/^\/api\/community\/messages\/([a-zA-Z0-9_-]{1,80})\/(remove|report)$/);
    if (!match) return message('Not found.', 404);
    const [, messageId, action] = match;
    const item = await db.communityMessage.findUnique({ where: { id: messageId }, select });
    if (!item) return message('Message not found.', 404);
    if (action === 'remove' && !admin && item.authorId !== user.id) return message('You can remove only your own messages.', 403);
    const parsed = reasonSchema.safeParse(await readBoundedJson(request.body, 8192));
    if (!parsed.success) return message('Provide a reason of 5–500 characters.', 400);
    if (action === 'remove') {
      await db.$transaction(async tx => {
        const changed = await tx.communityMessage.updateMany({ where: { id: messageId, hiddenAt: null, ...(!admin ? { authorId: user.id } : {}) }, data: { hiddenAt: new Date(), imageData: null } });
        if (changed.count) await tx.auditEvent.create({ data: { actorId: user.id, targetId: messageId, action: admin ? 'COMMUNITY_MESSAGE_HIDDEN' : 'COMMUNITY_MESSAGE_REMOVED', details: { reason: parsed.data.reason } } });
      });
      return message('Message removed.');
    }
    if (item.hiddenAt) return message('Message unavailable.', 404);
    if (!(await takeRateLimit('community:report', user.id, 5, 60))) return message('Report limit reached. Try again later.', 429);
    await db.communityReport.upsert({ where: { messageId_reporterId: { messageId, reporterId: user.id } }, create: { messageId, reporterId: user.id, reason: parsed.data.reason }, update: {} });
    return message('Report sent to the administrators.', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'IMAGE_BUSY') return message('Image processing is busy. Try again shortly.', 429);
    if (error instanceof Error && error.message === 'INVALID_IMAGE') return message('Choose a valid JPG, PNG or WebP image up to 5 MB and 16 megapixels.', 400);
    if (error instanceof Error && error.message === 'BODY_TOO_LARGE') return message('Request body too large.', 413);
    if (error instanceof Error && error.message === 'INVALID_JSON') return message('Invalid JSON.', 400);
    return message('Community is temporarily unavailable. Try again shortly.', 503);
  }
}
