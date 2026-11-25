import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { digestToken, newToken } from '../../apps/web/server/security.js';
const db = new PrismaClient();
test.afterAll(async () => { await db.$disconnect(); });
test('dashboard shows unavailable metrics and a responsive navigable Malaysia calendar', async ({ page }, info) => {
  const user = await db.user.create({ data: { name: 'Dashboard fixture', email: `dashboard-${info.project.name}-${Date.now()}@example.test`, role: 'ADMIN', passwordHash: 'synthetic-no-login' } });
  try {
    const token = newToken(); await db.session.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    await page.context().addCookies([{ name: '__Host-yengfx_session', value: token, domain: '127.0.0.1', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
    await page.goto('/app');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await page.getByRole('link', { name: /Open P\/L Calendar/ }).click();
    await expect(page.locator('.performance-card')).toHaveCount(6);
    await expect(page.locator('.performance-card > strong')).toHaveText(Array(6).fill('—'));
    await expect(page.getByText('No trade history connected', { exact: true })).toBeVisible();
    const month = await page.locator('[data-calendar-month]').textContent();
    await expect(page.locator('.pl-day[aria-current="date"]')).toHaveCount(1);
    await page.locator('.pl-day').first().click(); await expect(page.locator('[data-selected-summary]')).toContainText('No trades recorded');
    await expect(page.locator('.pl-day[aria-pressed="true"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Previous month', exact: true }).click();
    await expect(page.locator('[data-calendar-month]')).not.toHaveText(month!);
    await page.getByRole('button', { name: 'Next month', exact: true }).click();
    await expect(page.locator('[data-calendar-month]')).toHaveText(month!);
    await page.getByRole('button', { name: 'Next month', exact: true }).click();
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(page.locator('[data-calendar-month]')).toHaveText(month!);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/screenshots/${info.project.name}-dashboard.png`, fullPage: true });
    await page.goto('/app/community');
    await expect(page.locator('.chat-room-about')).not.toContainText('All registered members can read.');
    await expect(page.locator('.chat-room-about')).toContainText('Progress begins with discipline.');
    await expect(page.locator('.chat-room-about')).toContainText('Stay patient. Trust your preparation.');
  } finally { await db.user.delete({ where: { id: user.id } }); }
});
