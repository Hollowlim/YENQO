import { expect, test } from '@playwright/test';

test('homepage renders a decorative grid without blocking navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const grid = page.locator('[data-shape-grid]');
  await expect(grid).toHaveAttribute('data-ready', 'true');
  await expect(grid).toHaveAttribute('aria-hidden', 'true');
  const logo = page.locator('.hero-brand-logo');
  await expect(logo).toBeVisible();
  expect(await logo.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(2076);
  const pixels = await grid.locator('canvas').evaluate(node => {
    const canvas = node as HTMLCanvasElement;
    return Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data).some((value, i) => i % 4 === 3 && value > 0);
  });
  expect(pixels).toBe(true);
  const cards = page.locator('[data-magic-bento] .offering-card');
  await expect(cards).toHaveCount(3);
  await cards.first().hover();
  await expect(cards.first()).toHaveCSS('--bento-power', '1');
  await page.mouse.move(0, 0);
  await expect(cards.first()).toHaveCSS('--bento-power', '0');
  await page.getByRole('link', { name: 'Explore free analysis' }).click();
  await expect(page).toHaveURL('/auth/login');
  expect(errors).toEqual([]);
});

test('reduced-motion preference renders a static grid', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const grid = page.locator('[data-shape-grid]');
  await expect(grid).toHaveAttribute('data-ready', 'true');
  const before = await grid.locator('canvas').evaluate(node => (node as HTMLCanvasElement).toDataURL());
  await expect(page.locator('.hero-brand-logo')).toHaveCSS('animation-name', 'none');
  await page.locator('[data-magic-bento] .offering-card').first().hover();
  await expect(page.locator('[data-magic-bento] .offering-card').first()).toHaveCSS('--bento-power', '0');
  await page.mouse.move(350, 350);
  // Wait across animation frames rather than a fixed timer: reduced motion must
  // remain static even after pointer input and normal rendering opportunities.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await grid.locator('canvas').evaluate(node => (node as HTMLCanvasElement).toDataURL())).toBe(before);
});
