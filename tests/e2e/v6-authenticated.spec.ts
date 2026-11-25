import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { digestToken, newToken } from '../../apps/web/server/security.js';
import { requireLocalTestDatabase } from '../support/test-database';

requireLocalTestDatabase();
const db = new PrismaClient();
test.afterAll(async () => { await db.$disconnect(); });

async function containedViewport(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test('V6 signup, account details, admin approval, launch gating and revocation remain functional', async ({ page, browser, baseURL }, info) => {
  if (!baseURL || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) throw new Error('Local test app required.');
  const prefix = `v6-auth-${info.project.name}-${Date.now()}`;
  const email = `${prefix}@example.test`;
  const adminEmail = `${prefix}-admin@example.test`;
  const displayName = `V6 ${info.project.name} Member`;
  const savedName = `${displayName} Updated`;
  const password = 'Synthetic V6 browser account only!';
  const account = info.project.name === 'phone' ? '70001390' : '70001440';
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://s3.tradingview.com/**', route => route.abort());
  const adminContext = await browser.newContext({
    baseURL,
    viewport: page.viewportSize() ?? { width: 1440, height: 1000 },
    isMobile: info.project.name === 'phone',
    hasTouch: info.project.name === 'phone',
  });
  await adminContext.route('https://s3.tradingview.com/**', route => route.abort());
  try {
    await test.step('Minimal signup proceeds to login and password visibility works', async () => {
      await page.goto('/auth/register');
      await expect(page.locator('[name="brokerName"], [name="mt5Account"]')).toHaveCount(0);
      await page.getByLabel('Display name', { exact: true }).fill(displayName);
      await page.getByLabel('Email address', { exact: true }).fill(email);
      const input = page.getByLabel('Password', { exact: true });
      await input.fill(password);
      await page.getByRole('button', { name: 'Show password', exact: true }).click();
      await expect(input).toHaveAttribute('type', 'text');
      await page.getByRole('button', { name: 'Hide password', exact: true }).click();
      await expect(input).toHaveAttribute('type', 'password');
      await page.getByRole('button', { name: 'Create account', exact: true }).click();
      await expect(page).toHaveURL(/\/auth\/login\?registered=1$/);
      await page.goto('/');
      await page.locator('.v7-hero .v7-button-gold').click();
      await expect(page).toHaveURL(/\/auth\/login$/);
      await page.getByLabel('Email or admin username', { exact: true }).fill(email);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(page).toHaveURL(/\/app\/membership$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Membership');
      expect((await page.request.get('/api/admin/dashboard')).status()).toBe(403);
      await containedViewport(page);
    });

    await test.step('Profile changes persist and qualifying deposit requests stay pending', async () => {
      await page.goto('/app/settings');
      const form = page.locator('[data-client-profile]');
      await expect(form.getByLabel('Display name', { exact: true })).toBeEnabled();
      await form.getByLabel('Display name', { exact: true }).fill(savedName);
      await form.getByLabel('Broker', { exact: true }).fill('JUSTMARKET');
      await form.getByLabel('MT5 account number', { exact: true }).fill(account);
      await form.getByLabel('MT5 server (optional)', { exact: true }).fill('Synthetic-Test-Server');
      await form.getByRole('button', { name: 'Save account details', exact: true }).click();
      await expect(page.locator('[data-profile-status]')).toContainText('Account details saved');
      await expect(page.locator('.v6-header-profile strong')).toHaveText(savedName);
      const image = await sharp({ create: { width: 80, height: 120, channels: 3, background: '#c99f56' } }).png().toBuffer();
      await page.locator('[data-photo-file]').setInputFiles({name:'synthetic-profile.png',mimeType:'image/png',buffer:image});
      await expect(page.locator('[data-photo-status]')).toContainText('Preview only');
      await page.getByRole('button',{name:'Save photo',exact:true}).click();
      await expect(page.locator('[data-photo-status]')).toContainText('Profile photo saved');
      await expect(page.locator('.v6-header-profile img')).toBeVisible();
      await page.reload();
      await expect(page.locator('.v6-header-profile img')).toBeVisible();
      await page.getByRole('button',{name:'Remove photo',exact:true}).click();
      await expect(page.locator('[data-photo-status]')).toContainText('Profile photo removed');
      await expect(page.locator('.v6-header-profile img')).toHaveCount(0);
      await expect(form.getByLabel('MT5 account number', { exact: true })).toHaveValue(account);
      await expect(form.getByLabel('Display name', { exact: true })).toHaveValue(savedName);
      await page.goto('/app/membership');
      await expect(page.locator('[data-membership-status]')).toHaveText('FREE');
      await page.getByLabel('MT5 account number', { exact: true }).fill(account);
      await page.getByLabel('Qualifying deposit (USD)', { exact: true }).fill('100');
      const submit = page.getByRole('button', { name: 'Submit verification request', exact: true });
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect(page.locator('[data-membership-status]')).toHaveText('PENDING');
      await page.goto('/app/academy');
      await expect(page).toHaveURL(/\/app\/membership\?notice=ib-required$/);
    });

    // Synthetic admin principal exists only in the guarded disposable test database.
    const adminUser = await db.user.create({ data: { email: adminEmail, name: 'Synthetic V6 Administrator', role: 'ADMIN', passwordHash: 'No password login for synthetic fixture' } });
    const token = newToken();
    await db.session.create({ data: { userId: adminUser.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 600000) } });
    await adminContext.addCookies([{ name: 'yengfx_session', value: token, url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
    const admin = await adminContext.newPage();
    admin.on('pageerror', error => errors.push(error.message));

    await test.step('Admin dashboard reads actual test database data and approves searched member', async () => {
      await admin.goto('/admin');
      await expect(admin.locator('[data-admin-dashboard]')).toHaveAttribute('data-admin-state', 'ready');
      await expect(admin.locator('[data-admin-source]')).toContainText('application database');
      const response = await admin.request.get('/api/admin/dashboard?days=30');
      expect(response.status()).toBe(200);
      const payload = await response.json();
      expect(payload.metrics.totalMembers).toBeGreaterThan(0);
      await containedViewport(admin);
      await admin.screenshot({ path: `docs/screenshots/v6-auth-${info.project.name}-admin.png`, fullPage: true });
      await admin.getByRole('link',{name:'My profile',exact:true}).first().click();
      await expect(admin).toHaveURL(/\/admin\/settings$/);
      const adminImage=await sharp({create:{width:100,height:100,channels:3,background:'#264c68'}}).png().toBuffer();
      await admin.locator('[data-photo-file]').setInputFiles({name:'synthetic-admin.png',mimeType:'image/png',buffer:adminImage});
      await admin.getByRole('button',{name:'Save photo',exact:true}).click();
      await expect(admin.locator('[data-photo-status]')).toContainText('Profile photo saved');
      await admin.reload();
      await expect(admin.locator('.v6-header-profile img')).toBeVisible();
      await admin.evaluate(() => { if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0); });
      await admin.screenshot({path:`docs/screenshots/profile-${info.project.name}-admin.png`,fullPage:true});
      await admin.goto('/admin/audit');
      await expect(admin.locator('[data-admin-audit]')).toHaveAttribute('data-audit-state', 'ready');
      await expect(admin.locator('[data-audit-status]')).toContainText('application database');
      await expect(admin.locator('[data-audit-events] tr').first()).toBeVisible();
      await containedViewport(admin);
      await admin.goto('/admin/members');
      await admin.getByLabel('Search clients', { exact: true }).fill(email);
      await admin.getByRole('button', { name: 'Search', exact: true }).click();
      const row = admin.locator('.client-record').filter({ hasText: email });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(account);
      await expect(row).toContainText('PENDING');
      await row.getByRole('heading', { name: savedName, exact: true }).click();
      const dialog = admin.getByRole('dialog', { name: 'Client membership review', exact: true });
      await expect(dialog).toBeVisible();
      const review = dialog.locator('.membership-review:not([hidden])');
      await expect(review).toHaveCount(1);
      await expect(review.getByLabel('Review reason (visible to the member)', { exact: true })).toBeHidden();
      await review.getByLabel('Verified qualifying deposit (USD)', { exact: true }).fill('100.00');
      await review.getByRole('checkbox').check();
      await review.getByRole('button', { name: 'Approve membership', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(row).toContainText('APPROVED');
      await containedViewport(admin);
    });

    await test.step('Verified dashboard stays honest about disconnected MT5 and Tools availability', async () => {
      await page.goto('/app/membership');
      await expect(page.locator('[data-membership-status]')).toHaveText('APPROVED');
      await expect(page.locator('.membership-plans')).toBeHidden();
      await expect(page.locator('#membership-request')).toBeHidden();
      await page.goto('/');
      await page.locator('.v7-hero .v7-button-gold').click();
      await expect(page).toHaveURL(/\/app$/);
      await expect(page.getByRole('heading', { name: 'Your YENGFX workspace.', exact: true })).toBeVisible();
      await expect(page.locator('.clean-summary-grid')).toContainText('Not connected');
      await expect(page.locator('[data-client-chart-status], [data-client-briefing]')).toHaveCount(0);
      await containedViewport(page);
      await page.screenshot({ path: `docs/screenshots/v6-auth-${info.project.name}-client.png`, fullPage: true });
      await page.getByRole('link', { name: /Open P\/L Calendar/ }).click();
      await expect(page.locator('[aria-label="No recorded data"]')).toHaveCount(6);
      await expect(page.locator('[data-calendar-days]')).not.toBeEmpty();
      await page.goto('/app/mt5');
      await expect(page.getByRole('heading', { name: 'Coming soon', exact: true })).toBeVisible();
      await expect(page.locator('[data-v2-trade]')).toHaveCount(0);
      await page.goto('/app/academy');
      await expect(page.locator('[data-education]')).toBeVisible();
    });

    await test.step('Deferred routes and APIs stay disabled for both verified members and admins', async () => {
      for(const context of [page,admin]){
        for(const route of ['/app/mapping','/app/signals','/app/community','/admin/mapping','/admin/signals'])expect((await context.request.get(route)).status()).toBe(404);
        for(const route of ['/api/content/analysis','/api/content/signals','/api/admin/analysis','/api/admin/signals','/api/community/messages']){
          expect((await context.request.get(route)).status()).toBe(404);
          expect((await context.request.post(route,{data:{title:'Should never publish'}})).status()).toBe(404);
        }
      }
      await admin.goto('/admin/content');
      await expect(admin.locator('[data-education="admin"]')).toBeVisible();
      await page.goto('/app');
      for(const route of ['/app/mapping','/app/signals','/app/community'])await expect(page.locator('a[href="'+route+'"]')).toHaveCount(0);
    });

    await test.step('Revocation requires a reason, closes review and removes protected access', async () => {
      await admin.goto('/admin/members');
      await admin.getByLabel('Search clients', { exact: true }).fill(email);
      await admin.getByRole('button', { name: 'Search', exact: true }).click();
      const row = admin.locator('.client-record').filter({ hasText: email });
      await row.getByRole('button', { name: 'Revoke', exact: true }).click();
      const dialog = admin.getByRole('dialog', { name: 'Client membership review', exact: true });
      await expect(dialog).toBeVisible();
      const review = dialog.locator('.membership-review:not([hidden])');
      await expect(review).toHaveCount(1);
      await expect(review.getByLabel('Review reason (visible to the member)', { exact: true })).toBeVisible();
      await review.getByLabel('Revoke reason', { exact: true }).selectOption('IB_CHANGED');
      await review.getByRole('button', { name: 'Revoke access', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(row).toContainText('REVOKED');
      await page.goto('/app/academy');
      await expect(page).toHaveURL(/\/app\/membership\?notice=ib-required$/);
      await expect(page.locator('[data-membership-status]')).toHaveText('REVOKED');
      await expect(page.locator('.membership-plans')).toBeVisible();
      await expect(page.locator('#membership-request')).toBeVisible();
      await expect(page.locator('[data-membership-reason]')).toContainText('Changed IB');
      // Revoked members retain their own profile and membership, never private Academy access.
      expect((await page.request.get('/app/signals')).status()).toBe(404);
      await page.goto('/app/settings');
      await expect(page.locator('[data-client-profile]')).toBeVisible();
      if (info.project.name === 'phone') await page.locator('[data-menu-toggle]').click();
      await page.locator('[data-logout]:visible').first().click();
      await expect(page).toHaveURL(/\/auth\/login$/);
      await page.goto('/app/settings');
      await expect(page).toHaveURL(/\/auth\/login/);
      expect(errors).toEqual([]);
    });
  } finally {
    await adminContext.close();
    // Delete only this run's fixtures, preserving concurrent suites and all unrelated rows.
    const fixtures = await db.user.findMany({ where: { email: { in: [email, adminEmail] } }, select: { id: true } });
    await db.auditEvent.deleteMany({ where: { actorId: { in: fixtures.map(user => user.id) } } });
    await db.user.deleteMany({ where: { email: { in: [email, adminEmail] } } });
  }
});
