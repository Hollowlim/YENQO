import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('local premium fonts load and branched navigation works with keyboard', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => { const loaded: string[] = []; document.fonts.forEach(font => { if (font.status === 'loaded') loaded.push(font.family); }); return loaded; })).toEqual(expect.arrayContaining(['Manrope', 'Outfit']));
  if (testInfo.project.name !== 'desktop') await page.getByRole('button', { name: 'Open navigation' }).click();
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  const branch = navigation.locator('summary');
  const mapping = navigation.getByRole('link', { name: 'Daily Analysis / Mapping', exact: true });
  await expect(mapping).toBeVisible();
  await branch.focus();
  await branch.press('Enter');
  await expect(mapping).toBeHidden();
  await branch.press('Enter');
  await expect(mapping).toBeVisible();
  await mapping.click();
  await expect(page).toHaveURL('/auth/login');
});

test('fonts also load from direct HTML files', async ({ page }) => {
  await page.goto(pathToFileURL(path.resolve('apps/web/pages/index.html')).href);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => { const loaded: string[] = []; document.fonts.forEach(font => { if (font.status === 'loaded') loaded.push(font.family); }); return loaded; })).toEqual(expect.arrayContaining(['Manrope', 'Outfit']));
});
