import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { digestToken, newToken } from '../../apps/web/server/security.js';
const db = new PrismaClient(); test.afterAll(async () => { await db.$disconnect(); });
test('client registers broker details, edits their account and an admin reviews the private directory', async ({ page, browser }, info) => {
  const prefix = `client-ui-${info.project.name}-${Date.now()}`, email = `${prefix}@example.test`;
  const adminContext = await browser.newContext({ viewport: page.viewportSize()! });
  try {
    await page.goto('/auth/register'); await page.getByLabel('Display name', { exact: true }).fill(prefix);
    await page.getByLabel('Email address').fill(email); await page.getByLabel('Password', { exact: true }).fill('Synthetic client profile password!');
    await page.getByLabel('Broker', { exact: true }).fill('JUSTMARKET'); await page.getByLabel('MT5 account number', { exact: true }).fill('00123456'); await page.getByLabel('MT5 server (optional)', { exact: true }).fill('Synthetic-Demo');
    await page.getByRole('button', { name: 'Create account', exact: true }).click(); await expect(page.locator('[data-form-message]')).toContainText('Account created');
    await page.goto('/auth/login'); await page.getByLabel('Email or admin username').fill(email); await page.getByLabel('Password', { exact: true }).fill('Synthetic client profile password!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page).toHaveURL('/app/mapping');
    await page.goto('/app/settings'); await expect(page.getByLabel('MT5 account number', { exact: true })).toHaveValue('00123456');
    await page.getByLabel('MT5 account number', { exact: true }).fill('00987654'); await page.getByRole('button', { name: 'Save account details' }).click();
    await expect(page.locator('[data-profile-status]')).toContainText('Account details saved');
    const admin = await db.user.create({ data: { name: 'Client directory admin', email: `${prefix}-admin@example.test`, role: 'ADMIN', passwordHash: 'synthetic-no-login' } });
    const token = newToken(); await db.session.create({ data: { userId: admin.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    await adminContext.addCookies([{ name: '__Host-yengfx_session', value: token, domain: '127.0.0.1', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
    const review = await adminContext.newPage(); await review.goto('http://127.0.0.1:3000/admin/members');
    await review.getByLabel('Search clients').fill(email); await review.getByRole('button', { name: 'Search', exact: true }).click();
    const card = review.locator('.client-record').filter({ hasText: email }); await expect(card).toContainText('00987654'); await expect(card).toContainText('JUSTMARKET');
    await expect(card).toContainText('Not a live MT5 connection'); expect(await review.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await review.screenshot({ path: `docs/screenshots/${info.project.name}-client-directory.png`, fullPage: true });
  } finally { await adminContext.close().catch(() => {}); await db.user.deleteMany({ where: { email: { startsWith: prefix } } }); }
});
