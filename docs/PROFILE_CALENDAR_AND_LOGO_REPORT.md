# Profile photos, P/L Calendar and new YF emblem

Completed 29 October 2026 in the existing plain HTML/JavaScript application.

Homepage follow-up: the complete approved `v4-hero-emblem.webp` is now the permanent visible hero, rather than a fallback that is replaced after loading. The previous reconstructed Earth/logo/rock composition is no longer loaded on this homepage. Ambient stars and particles still honor reduced motion and offscreen suspension. This supersedes the independent scene-motion descriptions below; the exact orbit trails, emblem and platform from the supplied artwork are retained.

Motion restoration: `hero-art-renderer.js` now animates local regions of that same approved image, with floating emblem pixels, drifting rocks, a gentle Earth-surface effect and a moving gold orbit highlight. It keeps the composition and static fallback. The surface effect does not implement a complete 3D Earth revolution. Reduced motion shows the unchanged source artwork. The renderer pauses offscreen, caps draws at 24 FPS and uses a high-resolution canvas to avoid the earlier downsampled appearance. Graphics failure retains the image and a restrained camera animation.

## User-visible changes

- P/L Calendar is a separate sidebar category at `/app/calendar`. The performance cards and monthly results were moved together. The Dashboard has a shortcut to it instead of a second embedded calendar. Existing access rules are retained; no trade results are fabricated.
- Clients can open Account Settings at `/app/settings`; admins have My profile at `/admin/settings`. Both have a gold profile card, pointer tilt, reduced-motion support, photo preview, save, cancel-preview and remove controls.
- Saved photos appear on the profile card, header and sidebar after upload and on subsequent visits. Changing a photo does not change broker details, membership verification or administrative permissions.
- The new supplied YF emblem replaces navigation branding, login branding and the large animated homepage emblem. The static hero fallback also uses the new emblem. Homepage layout, text, links, Earth rotation, independent rock drift and reduced-motion behavior are retained.

## Photo storage and authorization

`202610260001_profile_photos` adds a separate `ProfilePhoto` table with an owner foreign key, size/hash constraints, row-level security and no public/anon/authenticated Data API grants. The additive migration was applied to the configured Supabase project. Existing client records were not changed.

The server-owned `/api/profile/photo` route supports GET, PUT and DELETE. Identity always comes from the authenticated session, including for admins. Supplying a different user ID cannot select another person's photo. Mutations require same-origin requests and are rate limited. Uploads are capped at 5 MB, decoded by the existing bounded image validator, normalized to 512px WebP, stripped of original metadata and saved transactionally with an audit event. SVG, corrupt data, oversized bodies, animated images and excessive pixel counts are rejected. Photo binaries are not included in session or member-directory projections.

Images are private to the account workspace in this version; this does not add public community profile-photo browsing. Offline HTML previews disable uploading and cannot save account data. Use the running app to sign in and upload.

## Brand assets and image generation

The original supplied file is preserved as `apps/web/public/yengfx-emblem-original.png`. Built-in image generation was used for two placement assets, followed by local WebP optimization; no API key or CLI fallback was used.

- `apps/web/public/yengfx-emblem-2026.png`: transparent placement asset.
- `apps/web/public/yengfx-mark-2026.webp`: optimized navigation and animated foreground emblem.
- `apps/web/public/v4-hero-emblem.webp`: updated static orbital hero fallback.
- `apps/web/public/branding-2026.css`: responsive emblem sizing only.

Cutout prompt: “Create a transparent-background production cutout of the exact supplied YF trading emblem. This is background removal only, not a redesign. Preserve the identical metallic gold and silver angular YF monogram, circular arc, every candlestick, all bevels, gold rim and silver facets, perspective and proportions. Remove the brown/gold/black atmospheric background to alpha transparency, including open spaces. Keep the complete emblem with no clipping. No text, new symbol, border or shadow rectangle.”

Hero prompt: “Replace only the old giant crowned YENGFX wordmark in the existing hero with the supplied new metallic YF circular trading monogram. Remove the old crown and lettering. Preserve the new emblem's angular geometry, arc and candlesticks. Keep the same right-hand foreground placement, Earth, black marble platform, orbit trails, floating rocks, lighting and wide composition, with dark empty space at left for separate website text. Do not add captions or interface elements.”

The original V6 homepage baseline remains archived. `LOGO_REFRESH_BASELINE.json` records only the three explicitly changed protected files: the two local homepage documents and the foreground asset reference in `hero-motion.js`. Other protected homepage files remain at their previous hashes.

## Verification

- `scripts\pnpm.cmd db:generate`: passed.
- `scripts\pnpm.cmd build`: passed; 34 screens and 39 HTML files validated.
- `scripts\pnpm.cmd lint`: passed with zero warnings.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`: 52 tests passed.
- `scripts\pnpm.cmd exec vitest run --config vitest.integration.config.ts`: 68 tests passed in 12 files using disposable local PostgreSQL. Tests cover image normalization, ownership including forged IDs, CSRF, invalid content, payload limits, persistence/removal and existing account/content/membership flows.
- `scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts`: 2 full client/admin flows passed, desktop and phone, including preview, upload, reload, avatar display, removal, calendar navigation and existing membership/publishing actions.
- `scripts\pnpm.cmd exec playwright test --config playwright.portal.config.ts`: 10 responsive checks passed across 1920, 1440, 1024, 834 and 390px layouts, with offline upload controls disabled.
- `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts`: 14 homepage, motion, responsive and asset-failure checks passed with the new emblem.

Screenshots use local synthetic accounts and test images, never real client records:

- [Desktop homepage](screenshots/desktop-v4-final.png)
- [Phone homepage](screenshots/mobile-v4-final.png)
- [Desktop admin profile](screenshots/profile-desktop-admin.png)
- [Phone admin profile](screenshots/profile-phone-admin.png)

MT5 execution remains disabled and Tools is Coming soon. P/L still requires genuine trade-history ingestion. The new image/CMS behavior has been exercised against local fixtures; no production signup, upload or member record was created for testing. Restart the configured application process to load the new server code and generated Prisma client.
