import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {isLaunchPathEnabled} from '../../apps/web/server/launch-policy.js';
import { routes } from '../../apps/web/server/render.js';

const file = (screen: string) => pathToFileURL(resolve(`apps/web/pages/${screen}.html`)).href;
const screens = [...routes].filter(([route]) => isLaunchPathEnabled(route) && (route === '/app' || route.startsWith('/app/') || route === '/admin' || route.startsWith('/admin/')));

test('every existing client/admin export is usable without overflowing or pretending to load private data', async ({ page }, info) => {
  const errors: string[] = [];
  const privateRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/api\//.test(request.url())) privateRequests.push(request.url()); });
  // Keep this suite deterministic and independent of a third-party chart service.
  await page.route('https://s3.tradingview.com/**', route => route.abort());
  for (const [route, [screen]] of screens) {
    await page.goto(file(screen));
    await expect(page.locator('body')).toHaveClass(/v6-portal/);
    await expect(page.locator('body')).toHaveClass(route.startsWith('/admin') ? /v6-admin/ : /v6-client/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.locator('.offline-banner')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
    if (route === '/app/mt5') {
      await expect(page.getByRole('heading', { name: 'Coming soon', exact: true })).toBeVisible();
      await expect(page.locator('[data-trade-action]')).toHaveCount(0);
      await expect(page.locator('[data-v2-trade]')).toHaveCount(0);
    }
    if (route === '/admin/members') {
      await expect(page.locator('[data-client-directory]')).toBeVisible();
      await expect(page.locator('[data-client-list]')).not.toContainText('Alex Tan');
      const dialog = page.locator('[data-membership-dialog]');
      await dialog.evaluate(node => (node as HTMLDialogElement).showModal());
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate(node => node.getBoundingClientRect().width <= innerWidth)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
    if (['/app/settings','/admin/settings'].includes(route)) {
      await expect(page.locator('[data-profile-card]')).toBeVisible();
      await expect(page.locator('[data-photo-file]')).toBeDisabled();
      await expect(page.locator('[data-photo-status]')).toContainText('Offline preview');
    }
    if (['/app', '/app/mapping', '/app/community', '/admin', '/admin/members'].includes(route)) {
      await page.screenshot({ path: `docs/screenshots/${info.project.name}-v6-${screen.replaceAll('/', '-')}.png`, fullPage: true });
    }
  }
  expect(errors).toEqual([]);
  expect(privateRequests).toEqual([]);
});

test('portal navigation, workspace finder, notifications and existing calendar stay interactive', async ({ page }) => {
  await page.route('https://s3.tradingview.com/**', route => route.abort());
  await page.goto(file('member/overview'));
  const search = page.getByRole('searchbox', { name: 'Find a workspace', exact: true });
  await search.fill('Academy');
  const results = page.locator('[data-portal-search-results]');
  await expect(results).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(results.getByRole('link').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(results).toBeHidden();
  await expect(search).toBeFocused();
  await search.fill('Academ');
  await expect(results).toBeVisible();
  await results.getByRole('link', { name: /Academy/i }).first().click();
  await expect(page.locator('[data-education]')).toBeVisible();
  await page.goto(file('member/overview'));
  const collapse = page.locator('[data-v2-collapse]');
  if (page.viewportSize()!.width >= 1200) {
    await collapse.focus();
    await page.keyboard.press('Enter');
    await expect(collapse).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  } else {
    const menu = page.locator('[data-menu-toggle]');
    if (await menu.isVisible()) {
      await menu.click();
      await expect(page.locator('#compact-navigation')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#compact-navigation')).toBeHidden();
    }
  }
  await page.getByRole('link', { name: /Open P\/L Calendar/ }).click();
  const month = page.locator('[data-calendar-month]');
  const before = await month.textContent();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(month).not.toHaveText(before ?? '');
  await page.locator('[data-calendar-days] button').first().click();
  await expect(page.locator('[data-selected-summary]')).toContainText('No trades recorded');
  await page.locator('.topbar a.notification-bell').click();
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Notifications');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
