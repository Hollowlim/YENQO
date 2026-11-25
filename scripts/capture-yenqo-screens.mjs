// Desktop + mobile screenshots of the YENQO portal using synthetic accounts.
// Usage: DATABASE_URL=<local test db> APP_ORIGIN=http://127.0.0.1:3001 node scripts/capture-yenqo-screens.mjs
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { digestToken, newToken } from '../apps/web/server/security.js';

if (!['127.0.0.1', 'localhost'].includes(new URL(process.env.DATABASE_URL ?? 'x://none').hostname)) throw new Error('Screenshots create fixtures: use an isolated local database only.');
const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3001';
const db = new PrismaClient();
const prefix = `yenqo-shots-${Date.now()}`;
const session = async (name, role = 'MEMBER', extra = {}) => {
  const user = await db.user.create({ data: { name, email: `${prefix}-${role}-${name.split(' ')[0]}@example.test`, role, passwordHash: 'synthetic-no-password-login', ...extra } });
  const token = newToken();
  await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 3600000) } });
  return { user, token };
};
const member = await session('Aisha Member');
const mentor = await session('Daniel Mentor', 'MEMBER', { mentorApprovedAt: new Date() });
const admin = await session('Platform Admin', 'ADMIN');
const room = await db.discussionRoom.create({ data: { title: 'XAUUSD London session study', description: 'Educational walkthroughs of structure and risk. Not trade signals.', ownerId: mentor.user.id, members: { create: [{ userId: mentor.user.id, role: 'OWNER' }, { userId: member.user.id }] } } });
for (const [author, kind, text, pinned] of [[mentor, 'ANNOUNCEMENT', 'Welcome. Charts shared here are for education only.', true], [mentor, 'ANALYSIS', 'Example: mark the prior day high and low before the session opens.', false], [member, 'MESSAGE', 'Thanks, how do you decide when a level is invalidated?', false]])
  await db.roomMessage.create({ data: { roomId: room.id, authorId: author.user.id, kind, text, clientKey: randomUUID(), pinnedAt: pinned ? new Date() : null } });

const out = 'docs/screenshots/yenqo';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const shots = [['home', '/', null], ['login', '/auth/login', null], ['tools', '/app/mt5', member], ['rooms', '/app/rooms', member], ['news', '/app/news', member], ['admin-platform', '/admin/platform', admin]];
for (const [device, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const [name, path, who] of shots) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    if (who) await context.addCookies([{ name: 'yengfx_session', value: who.token, url: origin }]);
    const page = await context.newPage();
    await page.goto(origin + path, { waitUntil: 'networkidle' });
    if (name === 'rooms') { await page.getByRole('button', { name: 'Open room' }).first().click(); await page.waitForSelector('[data-yq-messages] li'); }
    await page.screenshot({ path: `${out}/${device}-${name}.png`, fullPage: name !== 'home' });
    await context.close();
  }
}
await browser.close();
await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
await db.$disconnect();
console.log(`Saved ${shots.length * 2} screenshots to ${out}.`);
