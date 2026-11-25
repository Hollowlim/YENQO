# YENGHUB V4 implementation

## Artwork clarity correction

Removed canvas resampling of the hero from the default homepage: original artwork now stays in the browser image pipeline. Assets are lossless WebP conversions of the supplied PNGs, with no sharpening/upscale claims. Removed low-opacity image treatment, restored serif hero/card typography and reference-like gold button framing. Small story images are rendered at native size rather than enlarged into blurred banners.

Measured source limits: hero 906×546; market 157×193; tools 173×204; signals 241×204; Community 175×218. Exact fidelity to the newly supplied large composition requires higher-resolution source artwork; these small crops cannot reproduce its native detail. The full reference screenshot was not baked into the UI. The optional WebGL source remains archived but is not loaded by default after this clarity fix.

Verification: build/lint/typecheck, 49 unit tests and all six active responsive browser journeys passed before the final image-size-only adjustment; build passed after that adjustment.

## Brief follow-through

The repeated V4 brief was compared with the implementation. Added a dashboard command desk with four working module links while retaining the unavailable performance metrics and functioning calendar. Signals now has one clear visual introduction and an entry/SL/TP format guide; Academy no longer repeats its hero heading. Shared dialogs and performance surfaces receive the V4 treatment.

The homepage now loads a small `cinematic-loader.js` rather than immediately fetching Three.js. It loads the scene once near the visible hero, skips the bundle for reduced motion and offline files, and stays absent from private routes. A standalone read-only local rendering smoke confirmed that reduced motion makes zero heavy-scene requests and normal mode loads once and renders.

Fresh verification: build/lint/typecheck passed, 49 unit tests passed, and six responsive V4 browser journeys passed including dashboard/calendar and Signals. Inspected the mobile command-desk screenshot. No backend content, membership rules or Tools availability changed.

## What changed

The supplied V4 SVG/PNG package is the primary reference. Six SVGs and the user's full brief are archived in `references/yenghub-v4/`. Individual hero/feature artwork was optimized into five local WebP assets; no complete page screenshot is used as UI.

- New public homepage: official YENGFX branding, orbital hero composition, live HTML typography/CTAs, desktop navigation and native mobile menu, four feature-discovery cards, three further narrative sections and membership requirements. Supersedes the former generic Y scene and long sticky scroll presentation.
- `index.html` is now a clean client-facing homepage with no developer preview banner and no automatic localhost redirect. `demo-preview.html` retains developer browsing controls.
- On the running website, the supplied hero artwork is rendered on a gently rotating/parallax WebGL plane. This preserves the exact brand instead of approximating its crown/lettering as unrelated geometry. This is layered 2.5D artwork, not a reconstructed 3D wordmark or volumetric model. Offline files use the same optimized static artwork to avoid file-origin WebGL texture restrictions. Reduced motion and WebGL failure preserve the static presentation.
- Shared V4 chrome: refined dark surfaces, restrained gold borders, typography and navigation treatment across existing workspace/admin/auth pages. Mapping, Academy and Community have dedicated art-backed introductions. Mapping includes a non-data analyst workflow; Academy and Community include working links into existing modules. Existing charts, publishing hooks, video access, messages/forms and role guards are retained.
- Tools remains Coming Soon for Beta 1. No new trading actions, cloud connection, fake lessons, sample messages, channel backend or fabricated market metrics were introduced. Other routes remain available under their existing permissions.

## Source

`apps/web/public/v4.css` contains scoped V4 layouts and responsive styles. `apps/web/pages/index.html` contains the real homepage markup. `apps/web/components/cinematic-scene.js` contains the local Three.js enhancement. The renderer allowlist, shared layout and preview exporter load the new assets; no remote script/CDN access or security-policy relaxation is needed.

The source inspiration page https://www.getlayers.ai/layer/lumea was read for atmosphere only; its template code was not copied. Existing local Outfit font is used for the screenshot-aligned interface. Italiana was not bundled in this change; no external font dependency was introduced.

## Verification

- `scripts\pnpm.cmd build`: passed, 32 screens exported and 36 HTML files validated.
- `scripts\pnpm.cmd lint`: passed.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`: 49 unit tests passed.
- `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts`: six V4 browser tests passed at 375, 390, 691, 834 and 1440px widths, including tall-phone coverage. Checks include clean client entry versus developer preview, image loading, four discovery destinations, mobile menu, reduced motion, workspace overflow, Tools availability and browser exceptions.
- Localhost smoke: WebGL artwork initialized, reduced motion removed it in favor of static art, Enter Hub reached actual login, and unsigned requests to Mapping/Academy/Community/Tools/Admin were redirected to login.
- Inspected desktop/mobile homepage screenshots. Current captures: `docs/screenshots/*-v4-final.png` and `v4-localhost-webgl.png`.

The old `cinematic-home.spec.ts` describes the superseded generic-Y scene; the active cinematic config now runs `v4-design.spec.ts`. Existing backend integration suites were not rerun or modified for this visual change. Chromium emulation/software WebGL is not physical Safari/iPad testing or a production FPS benchmark.

## Limits

This is a V4 visual integration with preserved functionality, not a new backend. The Academy and Community screenshots' fictional lessons/discussions/rooms were intentionally not imported as actual records. The existing dashboard retains real unavailable metrics/calendar behavior; it is restyled rather than replaced with invented performance. Live Chat, EA connectivity, trading and streaming keep their existing availability. No deployment or Firebase migration occurred.

View the client homepage with `apps/web/pages/index.html`; browse designs with `demo-preview.html`. For real login and the WebGL layer use http://127.0.0.1:3000/ while the Node server is running.
