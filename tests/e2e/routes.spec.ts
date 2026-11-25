import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { digestToken, newToken, hashPassword } from '../../apps/web/server/security.js';

const db = new PrismaClient();
const fullEmail = `full-ui-${Date.now()}-${process.pid}@example.test`;
test.beforeAll(async () => {
  // Run only against a dedicated local test/demo database; these are test budgets.
  await db.rateLimit.deleteMany({ where: { OR: [
    { key: { startsWith: 'auth-public:' } }, { key: { startsWith: 'register-global:' } },
    { key: { in: [`login-email:${digestToken('member@yengfx.test')}`, `login-email:${digestToken('admin@yengfx.test')}`] } },
  ] } });
  const reviewer = await db.user.findUniqueOrThrow({ where: { email: 'admin@yengfx.test' } });
  await db.user.create({ data: { email: fullEmail, name: 'Demo Member', passwordHash: await hashPassword(process.env.DEMO_MEMBER_PASSWORD!), membership: { create: {
    status: 'APPROVED', verifiedBroker: 'JUSTMARKET', verifiedIbCode: 'jai4w0w6', verifiedDepositCents: 10000, verifiedAt: new Date(), verifiedById: reviewer.id,
    reviewReason: 'Synthetic UI test fixture; not a real broker verification.',
  } } } });
});
test.afterAll(async () => { await db.user.deleteMany({ where: { email: fullEmail } }); await db.$disconnect(); });

test('public home, accessible navigation and auth scaffolding', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('YENGFX HUB');
  await expect(page.getByText('DEMO', { exact: false }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-landing.png`, fullPage: true });
  for (const route of ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-shape-grid]')).toHaveAttribute('data-ready', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('all member screens render without overflow and all trading controls stay disabled', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/auth/login');
  await page.getByLabel('Email or admin username').fill(fullEmail);
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_MEMBER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/app');
  const routes = ['/app', '/app/mt5', '/app/mt5/devices', '/app/mt5/commands/example', '/app/signals', '/app/signals/demo-structure', '/app/signals/demo-support', '/app/signals/demo-review', '/app/mapping', '/app/strategy', '/app/backtesting', '/app/academy', '/app/academy/market-structure', '/app/academy/risk-and-discipline', '/app/academy/mentorship', '/app/journal', '/app/membership', '/app/notifications', '/app/settings'];
  for (const route of routes) {
    expect((await page.goto(route))?.status(), route).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('DEMO · NOT LIVE', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
    if (route === '/app/settings') {
      await expect(page.getByLabel('Display name', { exact: true })).toHaveValue('Demo Member');
      await expect(page.getByLabel('Email', { exact: true })).toHaveValue(fullEmail);
    }
    if (route === '/app/mt5') {
      const controls = page.getByRole('group', { name: 'Disabled trading controls' }).getByRole('button');
      await expect(controls).toHaveCount(9);
      await expect(controls).toHaveText(['TP 50', 'SL 30', 'Breakeven', 'Secure 25%', 'Secure 50%', 'Secure 75%', 'Secure 90%', 'Clear SL/TP', 'Close All']);
      await expect(page.getByRole('heading', { name: 'MT5 Control Center', exact: true })).toBeVisible();
      await expect(page.locator('.mt5-metric strong')).toHaveText(['—', '—', '—', '—']);
      for (const button of await controls.all()) await expect(button).toBeDisabled();
    }
    if (['/app', '/app/mt5', '/app/strategy', '/app/backtesting'].includes(route)) {
      await page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-${route === '/app' ? 'overview' : route.split('/').pop()}.png`, fullPage: true });
    }
  }
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/app\/mt5\?notice=admin-required/);
  await expect(page.locator('.notice[role="status"]')).toContainText('Administrator access');
  expect((await page.goto('/app/signals/not-a-signal'))?.status()).toBe(404);
  expect((await page.goto('/app/mt5/commands/not-a-receipt'))?.status()).toBe(404);
  await page.goto('/app');
  if (testInfo.project.name !== 'desktop') {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Account navigation' }).getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL('/app/settings');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  } else await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('/auth/login');
  expect(errors).toEqual([]);
});

test('free members can view mapping while Tools and Educations remain locked', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email or admin username').fill('member@yengfx.test');
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_MEMBER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/app/mapping');
  await expect(page.getByRole('heading', { name: 'XAUUSD Daily Mapping' })).toBeVisible();
  for (const route of ['/app/mt5', '/app/academy']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/app\/membership\?notice=ib-required/);
  }
  await page.goto('/app/signals');
  await expect(page).toHaveURL('/app/signals');
  await expect(page.getByRole('heading', { name: 'Signals', exact: true })).toBeVisible();
});

test('all admin shells require the database admin role and show no customer positions', async ({ page }, testInfo) => {
  await page.goto('/auth/login');
  await page.getByLabel(/Email address|Email or admin username/).fill('admin@yengfx.test');
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/admin');
  for (const route of ['/admin', '/admin/signals', '/admin/mapping', '/admin/content', '/admin/members', '/admin/audit']) {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
    await expect(page.getByRole('button', { name: 'Close All', exact: true })).toHaveCount(0);
    if (route === '/admin') await page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-admin.png`, fullPage: true });
  }
});

test('signup, sign-in, reset and old-session revocation work through forms', async ({ page }, testInfo) => {
  const email = `browser-${testInfo.project.name}-${Date.now()}@example.test`;
  const password = 'Browser test only passphrase 2026!';
  try {
    await page.goto('/auth/register');
    await page.getByLabel('Display name').fill('Browser Test Member');
    await page.getByLabel(/Email address|Email or admin username/).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Account created');
    await page.getByRole('link', { name: 'Back to sign in' }).click();
    await page.getByLabel(/Email address|Email or admin username/).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL('/app/mapping');
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const token = newToken();
    await db.passwordReset.create({ data: { userId: user.id, tokenHash: digestToken(token), expiresAt: new Date(Date.now() + 60000) } });
    await page.goto(`/auth/reset-password?token=${token}`);
    await page.getByLabel('New password').fill(`${password}new`);
    await page.getByRole('button', { name: 'Update password', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Password updated');
    await page.goto('/app');
    await expect(page).toHaveURL('/auth/login');
    await page.getByLabel(/Email address|Email or admin username/).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(`${password}new`);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL('/app/mapping');
  } finally { await db.user.deleteMany({ where: { email } }); }
});

test('private pages require a session, including dynamic and admin routes', async ({ page }) => {
  for (const route of ['/app', '/app/signals/demo-structure', '/app/mt5/devices', '/app/mt5/commands/example', '/admin', '/admin/members']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth\/login/);
  }
});

test('unknown routes return 404', async ({ page }) => {
  expect((await page.goto('/unknown-page'))?.status()).toBe(404);
});
