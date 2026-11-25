import { expect, test, type BrowserContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { digestToken, newToken } from '../../apps/web/server/security.js';
import { removeVideo } from '../../apps/web/server/video-storage.js';
const db = new PrismaClient();
test.afterAll(async () => { await db.$disconnect(); });
test('admin uploads a playable MP4 and publishes it to verified members with reordered navigation', async ({ page, browser }, info) => {
  const prefix = `education-ui-${info.project.name}-${Date.now()}`;
  const adminContext = await browser.newContext({ viewport: page.viewportSize()! });
  const signIn = async (context: BrowserContext, name: string, role: 'ADMIN' | 'MEMBER') => {
    const user = await db.user.create({ data: { name, role, email: `${prefix}-${name}@example.test`, passwordHash: 'synthetic-no-login' } });
    const token = newToken(); await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    await context.addCookies([{ name: '__Host-yengfx_session', value: token, domain: '127.0.0.1', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
    return user;
  };
  try {
    const adminUser = await signIn(adminContext, 'admin', 'ADMIN'), member = await signIn(page.context(), 'member', 'MEMBER');
    await db.membership.create({ data: { userId: member.id, status: 'APPROVED', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedById: adminUser.id, verifiedAt: new Date() } });
    const admin = await adminContext.newPage(); await admin.goto('http://127.0.0.1:3001/admin/content');
    await expect(admin.locator('[data-education-status]')).toContainText('New lesson');
    await admin.getByLabel('Title', { exact: true }).fill(prefix);
    await admin.getByLabel('Description', { exact: true }).fill('Synthetic education video for testing. <img src=x onerror=alert(1)>');
    await admin.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(admin.locator('[data-education-status]')).toContainText('Draft saved');
    await admin.getByLabel('MP4 video', { exact: true }).setInputFiles('tests/fixtures/lesson.mp4');
    await admin.getByRole('button', { name: 'Upload video', exact: true }).click();
    await expect(admin.locator('[data-education-status]')).toContainText('Video uploaded');
    await page.goto('/app/academy'); await expect(page.getByRole('article', { name: prefix, exact: true })).toHaveCount(0);
    await admin.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(admin.locator('[data-education-status]')).toContainText('Published');
    await page.reload();
    const card = page.getByRole('article', { name: prefix, exact: true }); await expect(card).toBeVisible();
    await expect(card.locator('img')).toHaveCount(0);
    const video = card.locator('video');
    await video.evaluate(async node => { const video = node as HTMLVideoElement; video.muted = true; await video.play(); });
    await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
    await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
    const memberLinks = await page.locator('.sidebar .branch-list').first().locator('a').allTextContents();
    expect(memberLinks.findIndex(text => text.includes('Signals'))).toBeLessThan(memberLinks.findIndex(text => text.includes('Community')));
    const adminLinks = await admin.locator('.sidebar .branch-list').first().locator('a').allTextContents();
    expect(adminLinks.findIndex(text => text.includes('Manual Signals'))).toBeLessThan(adminLinks.findIndex(text => text.includes('Mapping CMS')));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/screenshots/${info.project.name}-video-educations.png`, fullPage: true });
    await admin.screenshot({ path: `docs/screenshots/${info.project.name}-education-editor.png`, fullPage: true });
    await admin.getByRole('button', { name: 'Archive', exact: true }).click(); await expect(admin.locator('[data-education-status]')).toContainText('Archived');
    await page.reload(); await expect(page.getByRole('article', { name: prefix, exact: true })).toHaveCount(0);
  } finally {
    await adminContext.close().catch(() => {});
    const rows = await db.videoLesson.findMany({ where: { title: prefix } });
    for (const row of rows) if (row.filename) await removeVideo(row.filename);
    await db.videoLesson.deleteMany({ where: { title: prefix } });
    await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
  }
});
