# YENGHUB — The Edge Is Earned

## Latest mobile direction: alternating sides

Tall-phone refinement: the composition is now vertically balanced within the scene rather than pinned at the top. Headline/art columns use a 60/40 split (reversed in alternating chapters), a smaller emblem and cleaner headline sizing. A chapter counter and working Next Chapter footer provide navigation on the cinematic screen. The 691×1290 screenshot size is now a permanent browser project. Build, lint, typecheck, 48 unit tests and 24 cinematic browser tests passed. Inspected previews: `docs/screenshots/mobile-tall-balanced.png` and `mobile-small-balanced.png`.

At the user's request, compact chapters now alternate the Y and headline left/right. Paragraphs and CTA rows span the width underneath so mobile copy remains readable. The artwork size is constrained to its title area, and WebGL reads that same CSS-sized anchor rather than duplicating responsive dimensions. Reduced-motion/static flow keeps the first chapter's fallback artwork on the correct side. Desktop composition is unchanged.

The browser regression now checks horizontal artwork/headline separation and vertical artwork/description separation above 16px for each compact chapter, plus CTA containment. Inspected mobile screenshots: `docs/screenshots/mobile-alternating-vision.png` and `mobile-alternating-tools.png`.

## Phone composition fix

The original 600px breakpoint left wide phones in the alternating desktop layout, allowing the Y to overlap chapter copy. Compact composition now applies through 1000px: a centered emblem area above centered copy, responsive headline sizes, 44px header touch targets and visible CTA rows. WebGL uses the same breakpoint and a smaller vertically bounded centerpiece. Desktop composition remains unchanged. Short/narrow screens use static flow so text and controls remain scrollable.

Regression checks now cover 375, 390, 691, 834 and 1440px widths. Every compact chapter asserts an art-to-text gap greater than 16px, centred artwork, CTA containment and no horizontal overflow. Build/lint/typecheck passed, 48 unit tests passed, and 20 cinematic browser tests passed. Additional manual browser checks at 320×780, 390×700 and 691×719 verified readable static fallbacks. Inspected screenshots: `docs/screenshots/wide-phone-tools-stacked.png` and `phone-community-stacked.png`. Chromium emulation does not replace physical-device/Safari testing.

The public homepage now contains a real WebGL cinematic scene, integrated into the existing HTML/CSS/JavaScript application. Member/admin pages, authentication, authorizations and database behavior were preserved. No trading endpoint or live MT5 connection was enabled.

## Delivered

- Four chapters: Vision, Trade Manager, Education and Legacy Community, with real existing application destinations. The existing gallery and membership requirements remain below the sequence.
- A beveled, extruded metallic gold Y, reflective champagne lighting, orbital rings and decorative particles. A custom shader adds liquid-metal background ribbons; a subtle material-normal shader animates metal reflections.
- Scroll-controlled emblem rotation, smooth camera movement and headline transitions. The official YENGFX logo stays in the header and provides the static fallback.
- Native viewport layouts for desktop/tablet/mobile. Inactive scenes are inert. Chapter links move keyboard focus to their headings. Reduced motion and short viewports use ordinary readable sections.
- Three.js is pinned and bundled locally using esbuild. The same-origin CSP remains intact; no CDN, remote model, texture or market-data fetch is required. The scene script is injected only on `/`, not on any authenticated workspace or auth screen.
- Rendering is capped at 30 FPS, pixel ratio at 1.5 desktop / 1.25 mobile, and particles at 160 desktop / 70 mobile. Rendering pauses outside the visible scene, behind the sticky header and in hidden tabs. GPU resources are disposed on teardown; unavailable/lost WebGL restores the original-logo fallback.

## Source and build

Reusable source: `apps/web/components/cinematic-scene.js`. Build: `scripts/build-cinematic.mjs`. The generated `apps/web/public/cinematic-scene.js` is checked for syntax but excluded from source lint/typecheck; the authored component is linted and typechecked. Three.js license notices are retained in the generated file.

The local scene bundle is **532,364 bytes**, or **137,738 bytes gzip** as measured in this build. Gzip is a measured transfer-size estimate, not a claim that the native local server compresses assets. Configure compression at production hosting/ingress.

Supplied `CODEX_PROMPT.md` and cinematic `index.html` were read. `REFERENCE_TEMPLATE_PROMPT.txt` was not present under the supplied parent folder; the available sample and explicit latest user brief grounded the implementation. The old prompt's Next.js instruction was superseded by the actual existing framework and the user's preference to keep HTML/JavaScript. The latest request explicitly selected a metallic Y centerpiece; the official wordmark is retained rather than replaced as site branding.

## Verification

| Command/check | Result |
| --- | --- |
| `scripts\pnpm.cmd build` | Passed: local scene bundle built; 32 screens exported; 36 HTML files validated |
| `scripts\pnpm.cmd lint` | Passed |
| `scripts\pnpm.cmd typecheck` | Passed |
| `scripts\pnpm.cmd test` | 48 unit tests passed, including homepage-only bundle isolation |
| `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts` | Nine browser checks passed across desktop, iPad and mobile |
| Localhost browser smoke | Homepage and CSP passed, assets stayed same-origin, Enter the Hub reached real login, nine private routes redirected an unsigned visitor to login |
| Independent source review | No important concrete bugs reported; reviewer did not run tests |

Browser coverage includes actual WebGL initialization, chapter switching, official-logo asset loading, alignment, overflow, keyboard focus exclusion, reduced motion, resolution bounds, offscreen pause, context loss and missing-WebGL fallback. Screenshots inspected: `docs/screenshots/desktop-yenghub-webgl.png` and `mobile-yenghub-webgl.png`; tablet screenshot also saved.

The tests use Chromium viewport emulation and software WebGL, not physical iPad/Safari testing or a production performance benchmark. Existing backend integration suites were not rerun because this change does not alter database/auth/trading behavior. The localhost smoke used only anonymous read-only requests and did not create or alter customer records.

## Viewing

- Real homepage: http://127.0.0.1:3000/.
- Offline design: open `apps/web/pages/demo-preview.html`.
- `apps/web/pages/index.html` continues to launch the real client entry when double-clicked.

The centerpiece is visual branding. MT5 remains disconnected/demo according to the existing user's role and preview context; no balance, broker result or live connection is invented. The cloud EA connection, live execution, Live Trade broadcasting and Firebase migration remain separate, unimplemented work.
