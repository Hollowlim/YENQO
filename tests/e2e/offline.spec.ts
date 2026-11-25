import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { routes } from '../../apps/web/server/render.js';

test('opening HTML files directly shows every styled category without a server', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const network: string[] = [];
  await page.route('https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js', route => route.abort());
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  for (const [, [file]] of routes) {
    await page.goto(pathToFileURL(path.resolve(`apps/web/pages/${file}.html`)).href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-shape-grid]')).toHaveCount(1);
    await expect(page.locator('[data-shape-grid]')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByText('OFFLINE UI PREVIEW', { exact: true })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(8, 9, 12)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), file).toBe(true);
    if (file === 'index') await page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-offline-home.png`, fullPage: true });
  }
  expect(network).toHaveLength(1);
  expect(network.every(url => url === 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js')).toBe(true);
  expect(errors).toEqual([]);
});

test('offline category navigation and filters work while authentication stays unavailable', async ({ page }) => {
  await page.goto(pathToFileURL(path.resolve('apps/web/pages/index.html')).href);
  await page.getByText('Explore all categories', { exact: true }).click();
  await page.getByRole('navigation', { name: 'All demo screens' }).getByRole('link', { name: 'Daily Analysis / Mapping', exact: true }).click();
  await expect(page).toHaveURL(/member\/mapping\.html/);
  await expect(page.getByRole('heading', { name: 'XAUUSD Daily Mapping' })).toBeVisible();
  await page.goto(pathToFileURL(path.resolve('apps/web/pages/auth/login.html')).href);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Password', { exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('local server');
});
