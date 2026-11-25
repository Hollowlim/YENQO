import { beforeAll, afterAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { digestToken, newToken } from '../../apps/web/server/security.js';
import { readFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { removeVideo } from '../../apps/web/server/video-storage.js';
const db = new PrismaClient(), base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const prefix = `education-${Date.now()}`;
let admin = '', free = '', verified = '', adminId = '', memberId = '', lessonId = '';
const payload = { title: prefix, description: '<img src=x> Synthetic video lesson.', version: 0, status: 'DRAFT' };
const post = (data: unknown) => fetch(base + '/api/admin/lessons', { method: 'POST', headers: { Cookie: admin, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const upload = (body: Uint8Array, version = 1, type = 'video/mp4') => fetch(`${base}/api/admin/lessons/${lessonId}/video`, { method: 'PUT', headers: { Cookie: admin, Origin: base, 'Content-Type': type, 'If-Match': String(version) }, body: body as BodyInit });
beforeAll(async () => {
  for (const role of ['ADMIN', 'MEMBER'] as const) {
    const user = await db.user.create({ data: { name: role, email: `${prefix}-${role}@example.test`, role, passwordHash: 'no-login-fixture' } });
    const token = newToken(); await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    const cookie = `__Host-yengfx_session=${token}; yengfx_session=${token}`;
    if (role === 'ADMIN') { admin = cookie; adminId = user.id; } else free = cookie;
  }
  const user = await db.user.create({ data: { name: 'verified', email: `${prefix}-verified@example.test`, passwordHash: 'no-login-fixture' } }); memberId = user.id;
  await db.membership.create({ data: { userId: user.id, status: 'APPROVED', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedById: adminId, verifiedAt: new Date() } });
  const token = newToken(); await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } }); verified = `__Host-yengfx_session=${token}; yengfx_session=${token}`;
});
afterAll(async () => {
  const rows = await db.videoLesson.findMany({ where: { title: prefix } });
  for (const row of rows) if (row.filename) await removeVideo(row.filename);
  await db.videoLesson.deleteMany({ where: { title: prefix } });
  await db.user.deleteMany({ where: { email: { startsWith: prefix } } }); await db.$disconnect();
});
it('protects lesson listings and upload routes with authentication and membership', async () => {
  expect((await fetch(base + '/api/content/lessons')).status).toBe(401);
  expect((await fetch(base + '/api/content/lessons', { headers: { Cookie: free } })).status).toBe(403);
  expect((await fetch(base + '/api/admin/lessons', { headers: { Cookie: free } })).status).toBe(403);
  expect((await fetch(base + '/api/admin/lessons', { headers: { Cookie: admin } })).status).toBe(200);
  expect((await fetch(base + '/api/admin/lessons', { method: 'POST', headers: { Cookie: admin, Origin: 'https://evil.test', 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(403);
});
it('creates private drafts and refuses publication without a video', async () => {
  const created = await post(payload); expect(created.status).toBe(201); lessonId = (await created.json()).item.id;
  expect((await post({ ...payload, id: lessonId, version: 1, status: 'PUBLISHED' })).status).toBe(400);
  const rows = await (await fetch(base + '/api/content/lessons', { headers: { Cookie: verified } })).json();
  expect(rows.items.some((item: { id: string }) => item.id === lessonId)).toBe(false);
  expect((await fetch(`${base}/api/content/lessons/${lessonId}/video`, { headers: { Cookie: verified } })).status).toBe(404);
});
it('rejects wrong formats, invalid containers, stale uploads, oversized declared bodies and CSRF', async () => {
  expect((await upload(Buffer.from('not a video'), 1, 'image/png')).status).toBe(415);
  expect((await upload(Buffer.from('not a video'))).status).toBe(400);
  expect((await upload(Buffer.from('not a video'), 99)).status).toBe(409);
  expect((await fetch(`${base}/api/admin/lessons/${lessonId}/video`, { method: 'PUT', headers: { Cookie: admin, Origin: 'https://evil.test', 'Content-Type': 'video/mp4' }, body: 'bad' })).status).toBe(403);
  const status = await new Promise<number>((resolve, reject) => {
    const req = httpRequest(`${base}/api/admin/lessons/${lessonId}/video`, { method: 'PUT', headers: { Cookie: admin, Origin: base, 'Content-Type': 'video/mp4', 'If-Match': '1', 'Content-Length': String(500 * 1024 * 1024 + 1), Connection: 'close' } }, response => { response.resume(); resolve(response.statusCode!); });
    req.on('error', reject); req.end();
  });
  expect(status).toBe(413);
});
it('streams a real synthetic MP4 into private storage and publishes it', async () => {
  const video = await readFile('tests/fixtures/lesson.mp4');
  const uploaded = await upload(video); expect(uploaded.status).toBe(200);
  expect((await uploaded.json()).item.bytes).toBe(video.length);
  expect((await post({ ...payload, id: lessonId, version: 2, status: 'PUBLISHED' })).status).toBe(200);
  const rows = await (await fetch(base + '/api/content/lessons', { headers: { Cookie: verified } })).json();
  const item = rows.items.find((item: { id: string }) => item.id === lessonId);
  expect(item.filename).toBeUndefined(); expect(item.createdById).toBeUndefined(); expect(item.version).toBe(3);
  expect((await upload(video, 3)).status).toBe(409);
});
it('serves byte ranges and HEAD while protecting direct URLs and rejecting invalid ranges', async () => {
  const url = `${base}/api/content/lessons/${lessonId}/video`;
  expect((await fetch(url)).status).toBe(401); expect((await fetch(url, { headers: { Cookie: free } })).status).toBe(403);
  const range = await fetch(url, { headers: { Cookie: verified, Range: 'bytes=0-31' } });
  expect(range.status).toBe(206); expect(range.headers.get('content-type')).toBe('video/mp4'); expect((await range.arrayBuffer()).byteLength).toBe(32);
  expect((await fetch(url, { method: 'HEAD', headers: { Cookie: verified } })).headers.get('accept-ranges')).toBe('bytes');
  expect((await fetch(url, { headers: { Cookie: verified, Range: 'bytes=99999999-' } })).status).toBe(416);
  const row = await db.videoLesson.findUniqueOrThrow({ where: { id: lessonId } });
  expect((await fetch(base + '/assets/' + row.filename)).status).toBe(404);
});
it('rechecks membership revocation and hides archived videos immediately', async () => {
  await db.membership.update({ where: { userId: memberId }, data: { status: 'REVOKED' } });
  expect((await fetch(`${base}/api/content/lessons/${lessonId}/video`, { headers: { Cookie: verified } })).status).toBe(403);
  expect((await post({ ...payload, id: lessonId, version: 1 })).status).toBe(409);
  expect((await post({ ...payload, id: lessonId, version: 3, status: 'ARCHIVED' })).status).toBe(200);
  await db.membership.update({ where: { userId: memberId }, data: { status: 'APPROVED' } });
  expect((await fetch(`${base}/api/content/lessons/${lessonId}/video`, { headers: { Cookie: verified } })).status).toBe(404);
  expect(await db.auditEvent.count({ where: { targetId: lessonId, actorId: adminId } })).toBe(4);
});
