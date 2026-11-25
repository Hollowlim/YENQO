# Product-focused homepage — 29 October 2026

The public homepage now explains YENGFX HUB through native interface previews, focused feature descriptions and clear joining steps. The reference was the public presentation concept of [SuperScalp](https://superscalp.my): show the product on devices and explain what it does. No SuperScalp assets, brand, copy or access-key authentication were imported.

## What changed

- Phone previews of Daily Analysis / Mapping and Manual Signals lead the page, with clear registration and login actions.
- A keyboard-accessible feature selector covers Mapping, Signals, Educations and Community. Educations includes a tablet preview. With JavaScript disabled, all four sections remain readable.
- A three-step joining section, Free / Verified membership comparison and native FAQ explain access. Free members can view Mapping and Signals and participate in Community. Private Educations requires admin verification of the JUSTMARKET IB relationship and qualifying USD 100 deposit.
- Tools stays visibly **Coming soon**. Broker actions remain disabled. Live support and MT5 connectivity are not advertised as available.
- The approved YF orbital artwork and animation remain in a separate brand section below the product explanation. Its renderer loads only when that section enters the viewport; reduced-motion and offscreen suspension remain supported.
- Header navigation, mobile menu, Escape handling, visible focus and responsive layouts were checked. Public CSS and the feature script load only on `/`.

No database migration, credential change, membership-policy change or authenticated trading operation was performed. Existing client/admin pages, authentication and CMS remain in their existing framework.

## Source and previews

- Edit the canonical public fragment: [`apps/web/templates/product-home.html`](../apps/web/templates/product-home.html).
- Public styles: [`product-home.css`](../apps/web/public/product-home.css); enhancement: [`product-home.js`](../apps/web/public/product-home.js).
- Open [`index.html`](../apps/web/pages/index.html) for the homepage or [`demo-preview.html`](../apps/web/pages/demo-preview.html) for the offline screen catalogue. These are generated exports. For real signup/login, use the running local server, not `file://`.
- [Desktop screenshot](screenshots/desktop-product-home.png), [phone screenshot](screenshots/mobile-product-home.png), [tablet preview section on phone](screenshots/mobile-product-education.png).

The four WebP images in `apps/web/public/product/` are captures of this project's own portal styles with **explicitly illustrative content**. They contain no real customer records, market prices, account profits or broker operations. Example messages and lesson titles are not testimonials or claims about published content. Screenshots cannot be interacted with; adjacent links open the corresponding portal.

Regenerate the images with:

```powershell
.\.tools\node-v24.22.0-win-x64\node.exe scripts/capture-product-previews.mjs
```

This helper starts a temporary loopback server, uses synthetic data, blocks external requests, never reads `.env` or the database and closes the browser/server afterward. Device frames are native HTML/CSS. No new framework or component package was added. Initial phone images total approximately 576 KB; the tablet and Community images are lazy-loaded. The existing cinematic renderer is deferred until its section is visible.

The previous immutable homepage baseline remains archived. `PRODUCT_HOMEPAGE_BASELINE.json` records the explicitly requested changes to the two entry exports and the initial visibility logic in `hero-motion.js`; other baseline assets remain protected.

## Verification

Run commands from the project root:

| Command | Outcome |
| --- | --- |
| `scripts\pnpm.cmd build` | Passed; 34 complete HTML exports, 40 HTML files and server/browser JavaScript validated |
| `scripts\pnpm.cmd lint` | Passed, zero warnings |
| `scripts\pnpm.cmd typecheck` | Passed |
| `scripts\pnpm.cmd test` | 55 unit tests passed in 16 files |
| `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts product-home --output .tools/product-home-final-results` | 14 passed across seven viewport configurations; feature selection, keyboard navigation, device images, registration destination, membership copy, FAQ, mobile menu and no-JavaScript content |
| `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts v4-design --output .tools/product-cinematic-final-results` | 14 passed across the same viewports; original artwork, rendered motion, reduced motion, offscreen pause, graphics failure fallback and portal destinations |
| `scripts\pnpm.cmd exec playwright test --config playwright.portal.config.ts --output .tools/product-portal-results` | 10 passed across five private-portal viewport configurations |

Homepage widths checked: 375, 390, 691, 834, 1440 and 2249 pixels, including two heights at 691 pixels. No horizontal overflow or browser page errors occurred in the passing checks. These browser checks cover local exports; a new production signup/login transaction or hosted-database integration audit was not required or performed for this public presentation change. No site was published.

Remaining limitations: Tools/cloud MT5 control and live support are not implemented by this change. The cinematic Earth effect remains a bounded image-surface animation rather than a full 3D globe simulation. Site availability and any existing deployment configuration still depend on the running backend and hosting setup.

## Initial subtle motion follow-up (superseded below)

Added short scroll entrances, a gentle initial phone float, feature-copy transitions and small hover responses for buttons, membership cards and device previews. The phone motion settles in under five seconds and does not loop. It preserves the original device angles, pauses offscreen or when the browser tab is hidden, and cancels immediately when reduced motion is requested. All content stays readable if JavaScript or the native animation API is unavailable. The private portals and existing cinematic renderer are unchanged.

[Watch the short motion preview](previews/product-home-motion.webm).

Follow-up verification: `scripts\pnpm.cmd build`, `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck` and `scripts\pnpm.cmd test` passed (55 unit tests). `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts product-home --output .tools/product-motion-results` passed all 21 browser checks across seven viewport configurations, including real animation progression, finite duration, retained device angle, offscreen pause/resume, reduced-motion cancellation and the existing product-page interactions.

## Continuous phone motion and orbital background

Following the user's request for ongoing motion, both hero phones now float continuously with independent 6.2-second and 7.6-second cycles. Their fixed presentation angles and full opacity are preserved, so the loop never repeats an entrance fade. Motion pauses offscreen and in hidden browser tabs, cancels for reduced-motion preferences, and restarts when that preference is switched off. No animation-frame JavaScript loop or additional library was added.

The supplied orbital YF artwork also appears as a full-width hero background, reusing the existing optimized `v4-hero-emblem.webp`. Layered dark gradients protect headline contrast and fade into the next section. On phones, the artwork sits behind the device previews, keeping the introductory text clear. The image is decorative and excluded from the accessibility tree. The two updated entry exports are recorded in the approved product homepage baseline.

Current verification: `scripts\pnpm.cmd build`, `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck` and `scripts\pnpm.cmd test` passed (55 unit tests). `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts product-home --output .tools/product-continuous-motion-results` passed 21 browser checks across seven viewport configurations. Tests verify continued progression beyond the old five-second endpoint, infinite playback, offscreen pause/resume, reduced-motion cancellation/restart, background image loading, readable product interactions and no horizontal overflow. No private portal, membership policy or trading operation changed.

## Keep the logo unobstructed

The orbital logo now has clear space in the opening hero. The continuously floating phones move to a dedicated product showcase immediately after the hero and feature strip. The desktop artwork is brighter on the right while the headline retains a dark contrast overlay. On mobile, the complete artwork appears above the text instead of behind the phones. The existing device animation and reduced-motion behavior are preserved.

Verification for this adjustment: `scripts\pnpm.cmd build`, `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck`, and `scripts\pnpm.cmd test` passed (55 unit tests). `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts product-home --output .tools/product-logo-layout-results` passed 21 checks across seven viewport configurations, including geometric checks that the phones do not overlap the hero and the mobile copy does not cover the artwork. [Desktop hero](screenshots/desktop-product-home.png), [mobile hero](screenshots/mobile-product-home.png), [floating phone showcase](screenshots/desktop-product-showcase.png).

## Coordinated section backgrounds and a single cinematic scene

The opening hero now contains the only full orbital artwork on the page, including the existing logo/rock animation and reduced-motion fallback. The duplicate lower image is replaced by a compact editorial section with the actual transparent YF mark, fine orbital outlines and the original discipline message. Phone previews remain in their separate showcase, preserving the unobstructed hero logo.

Other homepage sections use lightweight CSS surfaces: a navy glow and floor grid behind the phone showcase, technical feature panels, warm diagonal detail behind the joining steps, subtle champagne illumination for verified membership, and orbital outlines around the closing action. No additional background image files or libraries were added. Decorative layers ignore pointer events; contrast, readable copy, responsive spacing and reduced-motion behavior remain intact.

Verification: `scripts\pnpm.cmd build`, `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck` and `scripts\pnpm.cmd test` passed (55 unit tests). `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts --output .tools/product-background-results` passed all **35 browser checks** across seven viewport configurations, including the single-scene requirement, phone animation, shader progression, offscreen pause, reduced-motion cancellation, graphics-failure fallback and existing portal destinations. Desktop, tablet and phone screenshots show no horizontal overflow or page errors.

Visual checks: [Membership](screenshots/desktop-product-membership.png), [new brand section](screenshots/desktop-product-perspective.png), [mobile closing section](screenshots/phone-product-closing.png). Authenticated client/admin code and access policies were unchanged. Tools remains Coming soon; no broker operation was enabled or performed.
