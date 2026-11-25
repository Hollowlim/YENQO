# Cinematic homepage integration

## Reference fidelity update

The public homepage now follows the sample's full-width presentation: its own slim branded header, four sticky scroll-driven scenes, a numbered chapter rail and alternating copy placement. The workspace sidebar/topbar are hidden only when the cinematic homepage is present; client/admin screens retain their original navigation. The official full YENGFX logo replaces the generic Y sculpture, with dimensional lighting and restrained floating motion. The feature gallery and membership requirements remain below the cinematic sequence.

Native CSS supplies the atmosphere rather than an externally loaded Three.js sculpture. Reduced motion, disabled JavaScript and short viewports use ordinary stacked sections. In animated mode inactive chapters are inert, and direct chapter selection moves keyboard focus to the selected heading. No public trading integration was added.

Regression coverage: `playwright.cinematic.config.ts` / `tests/e2e/cinematic-home.spec.ts` checks scene selection, inactive focus exclusion, logo loading, overflow and reduced-motion fallback on all three configured viewports. Updated screenshots: `docs/screenshots/*-cinematic-v3.png`.

Final V3 checks: build, lint and typecheck passed; 47 unit tests and three cinematic browser tests passed. The hero uses the full-resolution 2076×757 official logo rather than the 680px preview asset; the compact header retains the smaller asset. Short viewports also use the stacked-section fallback to keep controls accessible.

Logo motion update: scroll progress now drives one full perspective rotation between chapters, with a small bank/tilt and a gold glow during the turn. Scrolling backwards reverses the turn; chapter stops return the logo to a readable orientation. The animation updates through the existing scroll requestAnimationFrame handler and disables in the reduced-motion/static fallback. All three cinematic browser tests now verify scroll-driven rotation and its reduced-motion reset; build, lint and typecheck also passed.

Timing refinement: rotation now triggers on a chapter change and lasts two seconds with eased acceleration/deceleration. Scrolling within the same chapter does not restart it. The two-sided logo and reduced-motion/static fallback remain. Build, lint, typecheck and all three cinematic browser tests passed, including a two-second transition-duration assertion.

Applied the visual direction from `E:/YENGFX HUB/index.html` to the public homepage. The source prompt was treated as reference material: the existing plain HTML/JavaScript architecture was retained rather than adopting its obsolete Next.js instruction.

## Integration by file

- `apps/web/pages/index.html`: cinematic hero with the actual existing logo; four native-anchor chapters for Vision, Tools, Mastery and Community; real application links; existing feature gallery and membership explanation retained.
- `apps/web/public/v2.css`: homepage-scoped serif headlines, metallic gold accents, floating logo, atmospheric lighting/orbit, restrained particles and responsive layouts. Reduced motion disables decorative animation. Portals keep their existing styling.
- `apps/web/public/v2.js`: optional IntersectionObserver updates the current chapter indicator. All links and content remain usable without this enhancement.
- `tests/unit/html.test.ts`: updated the logo-rendering assertion for the new hero markup while retaining asset-path verification.
- `scripts/export-preview.mjs`: existing exporter regenerates the cinematic design in `demo-preview.html`; `index.html` still opens the real client entry when double-clicked.

## Verification

- `scripts\pnpm.cmd build`: passed; 32 exported screens, 36 HTML files validated.
- `scripts\pnpm.cmd lint`: passed.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`: 47 tests passed.
- Chromium checks at 1440×1000, 834×1112 and 390×844: four chapters, chapter anchor navigation, logo loading, no horizontal overflow, reduced-motion handling and no page JavaScript errors passed.
- Actual public homepage's Enter the Hub link led a signed-out browser to `/auth/login` through existing server authorization.
- Inspected desktop screenshot; saved desktop/tablet/mobile screenshots under `docs/screenshots/*-cinematic-homepage.png`.

The effects are native CSS rather than the sample's Three.js shader or fixed 710vh scene. This keeps the story in ordinary document flow, with a shorter mobile layout and no GPU/CDN dependency. The sample's simulated manager, fake course progress and demo community were not substituted for working application features. No database, login, membership authorization, client/admin portal functionality or trading behavior was changed. MT5 remains disconnected and execution disabled.

Preview: open `apps/web/pages/demo-preview.html`. Real homepage: http://127.0.0.1:3000/.
