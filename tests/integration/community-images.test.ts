import {archivedController} from '../support/archived-controller';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { digestToken, newToken } from '../../apps/web/server/security.js';
const db = new PrismaClient(), base = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000';
const prefix = `photos-${Date.now()}`;
let admin = '', member = '', free = '', memberId = '', image = '', messageId = '';
const get = (path: string, cookie = '') => archivedController(base + path, { headers: { Cookie: cookie } });
const post = (path: string, data: unknown, cookie = member, origin = base) => archivedController(base + path, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
beforeAll(async () => {
  const create = async (name: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') => {
    const user = await db.user.create({ data: { name, role, email: `${prefix}-${name}@example.test`, passwordHash: 'synthetic-no-login' } });
    const token = newToken(); await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    return { id: user.id, cookie: `__Host-yengfx_session=${token}; yengfx_session=${token}` };
  };
  const a = await create('admin', 'ADMIN'), m = await create('writer'), f = await create('reader');
  admin = a.cookie; member = m.cookie; free = f.cookie; memberId = m.id;
  await db.membership.create({ data: { userId: m.id, status: 'APPROVED', plan: 'LIFETIME', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedById: a.id, verifiedAt: new Date() } });
  image = (await sharp({ create: { width: 64, height: 32, channels: 3, background: '#e8be68' } }).png().toBuffer()).toString('base64');
});
afterAll(async () => { await db.user.deleteMany({ where: { email: { startsWith: prefix } } }); await db.$disconnect(); });
it('requires authenticated verified posters and same origin for photos', async () => {
  const data = { text: 'Synthetic photo', image: { base64: image }, clientKey: randomUUID() };
  expect((await post('/api/community/messages/photo', data, '')).status).toBe(401);
  expect((await post('/api/community/messages/photo', data, free)).status).toBe(201);
  expect((await post('/api/community/messages/photo', data, member, 'https://evil.test')).status).toBe(403);
});
it('allows an image-only post, re-encodes it privately and deduplicates retries', async () => {
  const data = { text: '', image: { base64: image }, clientKey: randomUUID(), authorId: 'forged' };
  const response = await post('/api/community/messages/photo', data); expect(response.status).toBe(201);
  const item = (await response.json()).message; messageId = item.id; expect(item.hasImage).toBe(true); expect(item.author.id).toBe(memberId);
  expect(item.imageData).toBeUndefined(); expect(item.imageHash).toBeUndefined();
  expect((await post('/api/community/messages/photo', data)).status).toBe(200);
  expect((await post('/api/community/messages/photo', { ...data, text: 'changed' })).status).toBe(409);
  expect((await get(`/api/community/messages/${messageId}/image`)).status).toBe(401);
  const photo = await get(`/api/community/messages/${messageId}/image`, free); expect(photo.status).toBe(200); expect(photo.headers.get('content-type')).toBe('image/webp');
  const metadata = await sharp(Buffer.from(await photo.arrayBuffer())).metadata(); expect(metadata.format).toBe('webp'); expect(metadata.width).toBe(64); expect(metadata.exif).toBeUndefined();
});
it('rejects forged formats, corrupt files, malformed base64 and excess image sizes', async () => {
  for (const base64 of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'), '!!!!', Buffer.from([137,80,78,71,13,10,26,10]).toString('base64'), Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64')]) {
    expect((await post('/api/community/messages/photo', { text: 'invalid image', image: { base64 }, clientKey: randomUUID() })).status).toBe(400);
  }
});
it('keeps an image-only report inspectable after its message leaves the latest feed page', async () => {
  expect((await post(`/api/community/messages/${messageId}/report`, { reason: 'Synthetic image-only report' }, free)).status).toBe(201);
  await db.communityMessage.createMany({ data: Array.from({ length: 55 }, (_, index) => ({ authorId: memberId, clientKey: randomUUID(), text: `${prefix} newer fixture ${index}` })) });
  try {
    const feed = await (await get('/api/community/messages', free)).json();
    expect(feed.messages.some((row: { id: string }) => row.id === messageId)).toBe(false);
    const reports = await (await get('/api/community/reports', admin)).json();
    const report = reports.reports.find((row: { messageId: string }) => row.messageId === messageId);
    expect(report.message.hasImage).toBe(true); expect(report.message.text).toBe('');
    expect((await get(`/api/community/messages/${report.message.id}/image`, admin)).status).toBe(200);
  } finally { await db.communityMessage.deleteMany({ where: { text: { startsWith: `${prefix} newer fixture` } } }); }
});
it('hides attached photos after moderation while regular Community remains open after revocation', async () => {
  expect((await post(`/api/community/messages/${messageId}/remove`, { reason: 'Synthetic photo moderation test' }, admin)).status).toBe(200);
  expect((await get(`/api/community/messages/${messageId}/image`, free)).status).toBe(404);
  expect((await db.communityMessage.findUniqueOrThrow({ where: { id: messageId } })).imageData).toBeNull();
  const feed = await (await get('/api/community/messages', free)).json();
  expect(feed.messages.find((row: { id: string }) => row.id === messageId).hasImage).toBe(false);
  await db.membership.update({ where: { userId: memberId }, data: { status: 'REVOKED', plan: 'FREE' } });
  expect((await post('/api/community/messages/photo', { text: 'revoked member retains regular Community', image: { base64: image }, clientKey: randomUUID() })).status).toBe(201);
});
