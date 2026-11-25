import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { db } from './db.js';
import { currentUser } from './auth.js';
import { isSameOrigin } from './security.js';
import { jsonResponse } from './http.js';
import { readBoundedJson } from './request-body.js';
import { takeRateLimit } from './rate-limit.js';
import { prepareCommunityImage } from './community-images.js';

export async function profilePhotoApi(request) {
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) return jsonResponse({ message: 'Method not allowed.' }, 405);
  const mutation = request.method !== 'GET';
  if (mutation && !isSameOrigin(request.headers.get('origin'), process.env.APP_ORIGIN)) return jsonResponse({ message: 'Request origin rejected.' }, 403);
  try {
    const user = await currentUser(request);
    if (!user) return jsonResponse({ message: 'Sign in required.' }, 401);
    if (!await takeRateLimit(`profile-photo:${request.method}`, user.id, mutation ? 10 : 120, 60)) return jsonResponse({ message: 'Too many requests. Try again shortly.' }, 429);
    // Ownership always comes from the session, including for administrators.
    if (!mutation) {
      const photo = await db.profilePhoto.findUnique({ where: { userId: user.id } });
      if (!photo) return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
      return new Response(new Uint8Array(photo.imageData), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    if (request.method === 'DELETE') {
      await db.$transaction(async tx => {
        const removed = await tx.profilePhoto.deleteMany({ where: { userId: user.id } });
        if (removed.count) await tx.auditEvent.create({ data: { actorId: user.id, targetId: user.id, action: 'PROFILE_PHOTO_REMOVED' } });
      });
      return jsonResponse({ photoUrl: null, message: 'Profile photo removed.' });
    }
    if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) return jsonResponse({ message: 'Use a supported photo upload.' }, 415);
    const payload = await readBoundedJson(request.body, 7 * 1024 * 1024);
    if (!payload || typeof payload.image !== 'string') return jsonResponse({ message: 'Choose a JPG, PNG or WebP photo, up to 5 MB.' }, 400);
    // Decode and re-encode instead of trusting the filename or browser MIME.
    // Existing decoder rejects SVG, corrupt files, animation and pixel bombs.
    const normalized = await prepareCommunityImage(payload.image);
    const imageData = await sharp(normalized.imageData).resize(512, 512, { fit: 'cover' }).webp({ quality: 84 }).toBuffer();
    const imageHash = createHash('sha256').update(imageData).digest('hex');
    await db.$transaction(async tx => {
      await tx.profilePhoto.upsert({ where: { userId: user.id }, create: { userId: user.id, imageData, imageHash }, update: { imageData, imageHash } });
      await tx.auditEvent.create({ data: { actorId: user.id, targetId: user.id, action: 'PROFILE_PHOTO_UPDATED' } });
    });
    return jsonResponse({ photoUrl: `/api/profile/photo?v=${imageHash}`, message: 'Profile photo saved.' });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'BODY_TOO_LARGE') return jsonResponse({ message: 'Photo upload is too large. Maximum 5 MB.' }, 413);
    if (['INVALID_IMAGE', 'INVALID_JSON'].includes(code)) return jsonResponse({ message: 'Choose a valid JPG, PNG or WebP photo, up to 5 MB.' }, 400);
    return jsonResponse({ message: code === 'IMAGE_BUSY' ? 'Photo processing is busy. Try again shortly.' : 'Your profile photo is temporarily unavailable. Try again shortly.' }, 503);
  }
}
