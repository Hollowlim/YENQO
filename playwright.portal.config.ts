import { defineConfig } from '@playwright/test';

// Presentation checks use exported HTML only; no sessions, credentials or database.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['v6-portals.spec.ts'],
  workers: 1,
  reporter: [['list']],
  use: { browserName: 'chromium', reducedMotion: 'reduce' },
  projects: [
    { name: 'portal-wide', use: { viewport: { width: 1920, height: 1080 } } },
    { name: 'portal-desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'portal-laptop', use: { viewport: { width: 1024, height: 900 } } },
    { name: 'portal-tablet', use: { viewport: { width: 834, height: 1112 }, hasTouch: true } },
    { name: 'portal-mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
