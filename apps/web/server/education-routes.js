import { randomUUID } from 'node:crypto';
import { open, rename } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { db } from './db.js';
import { currentUser } from './auth.js';
import { isSameOrigin } from './security.js';
import { hasFullMemberAccess } from './membership-policy.js';
import { jsonResponse } from './http.js';
import { takeRateLimit } from './rate-limit.js';
import { readBoundedJson } from './request-body.js';
import { MAX_VIDEO_BYTES, videoPath, prepareVideoStorage, removeVideo, validateMp4, videoRange } from './video-storage.js';
const schema = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).optional(), version: z.number().int().min(0), title: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(6000), status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) });
const select = { id: true, title: true, description: true, status: true, version: true, bytes: true, createdAt: true, updatedAt: true, publishedAt: true };
const message = (message, status) => jsonResponse({ message }, status);
const active = new Set();
export async function educationApi(request) {
  const url = new URL(request.url), admin = url.pathname.startsWith('/api/admin/');
  const match = url.pathname.match(/\/lessons\/([a-zA-Z0-9_-]{1,80})\/video$/), id = match?.[1];
  if (!['GET', 'HEAD'].includes(request.method) && !isSameOrigin(request.headers.get('origin'), process.env.APP_ORIGIN)) return message('Request origin rejected.', 403);
  try {
    const user = await currentUser(request);
    if (!user) return message('Sign in required.', 401);
    if (admin ? user.role !== 'ADMIN' : !hasFullMemberAccess(user)) return message(admin ? 'Administrator access required.' : 'Verified IB membership and qualifying USD 100 deposit required.', 403);
    if (!await takeRateLimit(`education:${request.method}`, user.id, request.method === 'PUT' ? 20 : 180, 60)) return message('Too many requests. Try again shortly.', 429);
    if (id && ['GET', 'HEAD'].includes(request.method)) {
      const lesson = await db.videoLesson.findFirst({ where: { id, ...(!admin ? { status: 'PUBLISHED' } : {}) } });
      if (!lesson?.filename) return message('Video not found.', 404);
      const file = await open(videoPath(lesson.filename), 'r').catch(() => null);
      if (!file) return message('Video temporarily unavailable.', 503);
      const { size } = await file.stat();
      const range = videoRange(request.headers.get('range'), size);
      if (!range) { await file.close(); return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Cache-Control': 'no-store' } }); }
      const headers = { 'Content-Type': 'video/mp4', 'Content-Length': String(range.end - range.start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', ...(range.partial ? { 'Content-Range': `bytes ${range.start}-${range.end}/${size}` } : {}) };
      if (request.method === 'HEAD') { await file.close(); return new Response(null, { headers, status: range.partial ? 206 : 200 }); }
      return new Response(/** @type {ReadableStream<Uint8Array>} */ (Readable.toWeb(file.createReadStream({ start: range.start, end: range.end }))), { headers, status: range.partial ? 206 : 200 });
    }
    if (id && admin && request.method === 'PUT') return await upload(request, id, user);
    if (id) return message('Not found.', 404);
    if (request.method === 'GET') {
      const before = url.searchParams.get('before');
      if (before && !await db.videoLesson.findFirst({ where: { id: before, ...(!admin ? { status: 'PUBLISHED' } : {}) }, select: { id: true } })) return message('Invalid cursor. Refresh the list.', 400);
      const rows = await db.videoLesson.findMany({ where: admin ? {} : { status: 'PUBLISHED' }, select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 31, ...(before ? { cursor: { id: before }, skip: 1 } : {}) });
      return jsonResponse({ items: rows.slice(0, 30), nextCursor: rows.length > 30 ? rows[29].id : null });
    }
    if (!admin || request.method !== 'POST') return message('Not found.', 404);
    const parsed = schema.safeParse(await readBoundedJson(request.body, 32768));
    if (!parsed.success) return message('Enter a title, description and valid lesson status.', 400);
    const { id: lessonId, version, ...data } = parsed.data;
    const item = await db.$transaction(async tx => {
      const previous = lessonId ? await tx.videoLesson.findUnique({ where: { id: lessonId } }) : null;
      if ((lessonId && (!previous || previous.version !== version)) || (!lessonId && version !== 0)) return null;
      if (data.status === 'PUBLISHED' && !previous?.filename) throw new Error('VIDEO_REQUIRED');
      const publishedAt = data.status === 'PUBLISHED' ? previous?.publishedAt ?? new Date() : previous?.publishedAt ?? null;
      let row;
      if (lessonId) {
        const changed = await tx.videoLesson.updateMany({ where: { id: lessonId, version }, data: { ...data, publishedAt, version: { increment: 1 } } });
        if (!changed.count) return null;
        row = await tx.videoLesson.findUniqueOrThrow({ where: { id: lessonId }, select });
      } else row = await tx.videoLesson.create({ data: { ...data, publishedAt, createdById: user.id }, select });
      await tx.auditEvent.create({ data: { actorId: user.id, action: 'VIDEO_LESSON_SAVED', targetId: row.id, details: { previous: previous ? { title: previous.title, description: previous.description, status: previous.status, version: previous.version } : null, content: JSON.parse(JSON.stringify(row)) } } });
      return row;
    });
    return item ? jsonResponse({ item }, lessonId ? 200 : 201) : message('Lesson changed. Reload before saving.', 409);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'VIDEO_REQUIRED') return message('Upload a video before publishing.', 400);
      if (error.message === 'BODY_TOO_LARGE') return message('Request too large.', 413);
      if (error.message === 'INVALID_JSON') return message('Invalid JSON.', 400);
    }
    return message('Education content is temporarily unavailable.', 503);
  }
}
async function upload(request, id, user) {
  if (request.headers.get('content-type') !== 'video/mp4') return message('Choose an MP4 video.', 415);
  const expectedVersion = Number(request.headers.get('if-match'));
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return message('Reload the lesson before uploading.', 409);
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_VIDEO_BYTES)) return message('Maximum video size is 500 MB.', 413);
  const lesson = await db.videoLesson.findUnique({ where: { id } });
  if (!lesson) return message('Lesson not found.', 404);
  if (lesson.version !== expectedVersion || lesson.status !== 'DRAFT') return message('Save as a draft and reload before uploading.', 409);
  if (active.has(id) || active.size >= 2) return message('An upload is already running. Try again shortly.', 409);
  active.add(id);
  const name = `${randomUUID()}.mp4`, partial = `${name}.partial`;
  let committed = false;
  try {
    await prepareVideoStorage();
    const file = await open(videoPath(partial), 'wx');
    let size = 0;
    try {
      if (!request.body) return message('Choose a video.', 400);
      const reader = request.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > MAX_VIDEO_BYTES) { await reader.cancel(); return message('Maximum video size is 500 MB.', 413); }
          await file.writeFile(value);
        }
      } finally { reader.releaseLock(); }
    } finally { await file.close(); }
    if (!await validateMp4(videoPath(partial), size)) return message('This file is not a supported MP4 container. Export as MP4 using H.264 video and AAC audio.', 400);
    await rename(videoPath(partial), videoPath(name));
    const item = await db.$transaction(async tx => {
      const changed = await tx.videoLesson.updateMany({ where: { id, version: expectedVersion, status: 'DRAFT' }, data: { filename: name, bytes: size, version: { increment: 1 } } });
      if (!changed.count) return null;
      await tx.auditEvent.create({ data: { actorId: user.id, targetId: id, action: 'VIDEO_LESSON_UPLOADED', details: { bytes: size, previousVersion: expectedVersion } } });
      return tx.videoLesson.findUniqueOrThrow({ where: { id }, select });
    });
    if (!item) return message('Lesson changed during upload. Reload and retry.', 409);
    committed = true;
    if (lesson.filename) await removeVideo(lesson.filename).catch(() => {});
    return jsonResponse({ item });
  } finally {
    active.delete(id);
    await removeVideo(partial).catch(() => {});
    if (!committed) await removeVideo(name).catch(() => {});
  }
}
