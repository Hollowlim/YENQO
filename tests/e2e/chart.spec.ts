import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('direct HTML automatically loads the fixed OANDA chart and supports retry', async ({ page }) => {
  let requests = 0;
  await page.route('https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js', async route => {
    requests++;
    if (requests === 1) return route.abort();
    await route.fulfill({ contentType: 'application/javascript', body: `document.currentScript.parentElement.dataset.testConfig = document.currentScript.textContent; const frame = document.createElement('iframe'); frame.height = '150'; frame.style.height = '150px'; frame.title = 'Chart height test'; document.currentScript.parentElement.append(frame);` });
  });
  await page.goto(pathToFileURL(path.resolve('apps/web/pages/member/mapping.html')).href);
  expect(requests).toBe(1);
  await expect(page.getByRole('button', { name: 'Load TradingView chart' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry TradingView chart' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry TradingView chart' }).click();
  const chart = page.locator('[data-tradingview-chart]');
  await expect(chart).toHaveAttribute('data-test-config', /OANDA:XAUUSD/);
  const config = JSON.parse((await chart.getAttribute('data-test-config'))!);
  expect(config.allow_symbol_change).toBe(false);
  expect(config.theme).toBe('dark');
  await expect(chart.locator('iframe')).toHaveCSS('height', page.viewportSize()!.width <= 600 ? '440px' : '560px');
});
