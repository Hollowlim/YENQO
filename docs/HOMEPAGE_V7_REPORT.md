# YENGFX homepage V7 — implementation and verification

31 October 2026, Asia/Kuala_Lumpur. Implemented in the existing plain HTML/CSS/JavaScript + native Node/Prisma application. This is the actual public `/` page, not a replacement application or disconnected mockup. See [inspection and implementation plan](HOMEPAGE_V7_PLAN.md).

**Owner review revision:** Removed the decorative planet/horizon that looked like a flat slab beneath the emblem, and removed the clipped foreground orbital line. The hero now keeps the official emblem, two complete orbital loops and floating rocks against a clean dark atmosphere. No horizon texture is requested by the current page. After this revision, build/lint/typecheck, all 64 unit tests and 12 desktop/mobile homepage browser checks passed; all 87 private preservation hashes and six zero-difference screenshot comparisons still pass. Other integration and nine-viewport results below describe the original V7 verification.

## Result

The supplied `YENGFX_Homepage_V7_Preview_Plus_Codex.zip` provides one approved full screenshot and three detail crops. The implementation follows its serif/gold headline hierarchy, dark restrained surfaces, editorial platform showcase, four feature cards and horizontal Academy collection. It adds the Legacy and closing/footer sections requested in the prompt. Screenshot references are never used as a full-page background or runtime UI.

The hero uses the existing, latest owner-approved transparent gold/silver YF asset, `yengfx-mark-2026.webp`. A layered CSS image plane, independent orbital loops, three dim metallic rocks and a low horizon provide depth without inventing new logo geometry. The logo face remains readable during slow drift. Gentle pointer movement is limited to the decorative scene. Text never rotates with it.

There is no WebGL runtime on the new homepage: static images and CSS perspective work without a GPU context and remain visible without JavaScript. Motion pauses outside the hero or in a hidden document, and becomes static for reduced motion, slow-update devices or devices reporting two or fewer logical processors. Section entrances last 550 ms; there is no fixed scroll story or scroll hijacking. The Academy collection supports buttons, native horizontal scrolling and keyboard arrows/Home/End.

## Real behavior and launch scope

- **Enter YENGHUB / Get started / Explore platform** uses `/app` when entering the app. The unchanged server sends guests to login, free members to Membership and verified members to their real dashboard. Navigation within the public page uses section anchors. Signup remains accessible through the existing registration route.
- The product image is a new capture of the **current member overview**, using its existing offline illustrative account. It contains no customer data, fabricated broker balance, positive return, current gold price or live-feed claim. Its frame and caption explicitly identify it as an interface preview.
- Beta 1 gates remain unchanged: Market Analysis / Mapping, Signals and in-app Community are deferred; their pages/APIs stay inaccessible. Feature cards state their availability and contain no links into those modules. Tools is Coming soon; broker execution is disabled.
- No Telegram promotion link was added. The Legacy section discusses discipline and perspective while stating that community conversations are handled separately.
- No public lesson catalog exists in the current API. The Academy showcase therefore labels every example as a **planned topic / Coming soon**, with no lesson totals or claimed publication. The actual lesson library remains behind the existing verified-member gate. No private catalog API, session changes or database changes were introduced.
- Footer links use supported destinations only. No privacy/legal page, testimonial, member count or trading statistic was invented.

## Implementation files

| File | Purpose |
| --- | --- |
| `apps/web/templates/homepage-v7-layout.html` | Public-only HTML shell, SEO metadata and scoped asset loading. |
| `apps/web/templates/homepage-v7.html` | Semantic sections, official branding, actual destinations and honest availability. |
| `apps/web/public/homepage-v7.css` | Isolated typography, tokens, layouts, perspective artwork, responsive styles and reduced-motion fallback. |
| `apps/web/public/homepage-v7.js` | Progressive menu, keyboard carousel, scene visibility/motion and restrained entrance behavior. No API requests or auth/trading operations. |
| `apps/web/server/render.js` | Selects the new public template/layout and allowlists new public assets. Private rendering behavior is unchanged. |
| `scripts/export-preview.mjs` | Resolves new assets in both local homepage entries. Prevents the existing profile fragment's trailing newline from accumulating during unrelated builds, keeping private exports byte-identical. |
| `scripts/capture-v7-workspace.mjs` | Reproducible capture of the existing offline member layout without credentials, database access or environment files. |
| `scripts/optimize-v7-art.mjs` | Resizes/re-encodes existing decorative assets; no generated replacement logo or scene. |
| `apps/web/public/homepage-v7/` | Member preview, optimized rock and horizon texture. |
| `tests/unit/homepage-v7.test.ts` and updated homepage/browser tests | Scope, route, data-honesty, accessibility, responsive and preservation coverage. |

Earlier homepage templates/styles/scene bundles remain archived in the repository. They are not loaded by the V7 public page. Member/admin layouts, CSS, scripts, authentication, membership policy, services and Prisma schema retain their prior hashes.

The optimized rock is 37,310 bytes (previous decorative source 445,548 bytes); the horizon texture is 110,362 bytes (previous source 685,418 bytes). The actual dashboard capture is about 95 KB. The homepage no longer downloads the earlier cinematic scene bundles or private-app scripts. Fonts are bundled locally. No Lighthouse/Core Web Vitals score is claimed; no field-performance measurement was performed.

## Verification

Checks ran with bundled Node 24.22.0 and `scripts\pnpm.cmd`. Integration/browser-account tests used disposable PostgreSQL at `127.0.0.1:5547` and the local test app at `127.0.0.1:3117`, never hosted customer data.

| Command | Actual outcome |
| --- | --- |
| `scripts\pnpm.cmd lint` | Passed, zero warnings. |
| `scripts\pnpm.cmd typecheck` | Passed, web and test types. |
| `scripts\pnpm.cmd test` | 64 tests passed across 19 files. |
| `scripts\pnpm.cmd test:integration` | 69 tests passed across 13 files, including HTTP delivery/MIME/CSP for new assets and preserved auth, ownership, membership, photos, video access and deferred module gates. |
| `scripts\pnpm.cmd exec playwright test --config=playwright.cinematic.config.ts` | 54 checks passed across nine viewports, including 1920, 1440, 1024, 834 and 390. Covers menu/keyboard/focus, carousel, no-JS content, motion pause, static fallback and supported links. |
| `scripts\pnpm.cmd exec playwright test --config=playwright.clean.config.ts` | 6 private-portal accessibility/layout checks passed. |
| `scripts\pnpm.cmd exec playwright test --config=playwright.portal.config.ts` | 10 private-portal export/navigation/search/calendar checks passed. |
| `scripts\pnpm.cmd exec playwright test --config=playwright.v6-auth.config.ts` | 2 complete desktop/phone account flows passed. Includes the new homepage CTA for guests and verified users, signup/login, account/photo persistence, admin review/approval, gated Academy, launch API denial, revocation and logout. |
| `scripts\pnpm.cmd build` | Passed: 26 active route exports; 50 HTML source/export files validated. |

The earlier homepage assertions were updated for the approved V7 layout rather than retaining tests tied to the removed phone showcase and WebGL scene. Existing portal/backend regression coverage remains. Browser testing found and fixed a compact-menu focus transition that could close the menu before a link activated.

### Portal preservation

`V7_PORTAL_PRESERVATION.json` records **87** protected source, export and rendered-route hashes captured before implementation. All match after the final build. `V7_PORTAL_SCREENSHOT_COMPARISON.json` records **zero changed pixels** for all six client/admin before/after screenshots at 1440, 834 and 390 widths. The workspace has no available Git metadata; these are actual hash/pixel checks, not a claimed Git diff.

The previous public homepage baselines are retained as history. `V7_HOMEPAGE_BASELINE.json` explicitly records only the intentional changes to the two public HTML entries and rendered homepage. No prior protected shared stylesheet, official logo or private source was silently rebaselined.

## Previews and limits

- [Desktop screenshot](screenshots/v7/desktop-homepage-tested.png)
- [Tablet screenshot](screenshots/v7/ipad-homepage-tested.png)
- [Mobile screenshot](screenshots/v7/mobile-homepage-tested.png)
- [1920 screenshot](screenshots/v7/full-hd-homepage-tested.png)

Open `apps/web/pages/index.html` for the homepage, or `apps/web/pages/demo-preview.html` for the explicit offline switcher. Real sign-in and private data require the running server. No domain, hosting, publication or production database operation was part of this task.

The supplied package has no exact 3D model or public lesson catalog; the implementation uses the prompt's approved image-plane fallback and clearly planned curricula. Publishing actual lessons, restoring deferred modules, adding a Telegram destination and connecting MT5 remain separate future work. None is enabled by this visual update.
