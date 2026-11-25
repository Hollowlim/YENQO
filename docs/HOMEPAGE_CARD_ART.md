# Homepage card artwork

## Current animation behaviour

As of 29 October 2026, the user's complete approved YF orbital artwork appears once, in the opening hero, with the phone/tablet product presentation in its own section below. The repeated lower image has been replaced by a compact brand section. See [the product homepage report](PRODUCT_HOMEPAGE_REPORT.md). A local shader animates regions of that same image: gentle emblem levitation, independent rock drift, subtle Earth-surface movement and a travelling orbit highlight. Ambient white stars and gold particles remain. The previous alternate scene is not loaded. Motion starts when the section enters view, stops offscreen and respects reduced-motion preferences. Graphics failure keeps the original image visible with a small camera movement. The Earth surface effect is a bounded image animation, not a full 3D globe rotation. The older renderer details below are historical implementation notes.

Natural rock refinement: rocks now use eight isolated sprite objects with constant shapes and proportions. Pixel-space rotation and translation replace the previous feathered image warping. Unequal slow drift paths, different depth amplitudes and gentle one-direction rotation remove the short synchronized bobbing. Inpainted background pixels fill only the former rock footprints, keeping the original emblem, platform and surrounding scene. These are 2D cutouts with rigid transforms, not simulated 3D asteroid meshes.

The built-in image-generation tool prepared `apps/web/public/v4-hero-clean.webp` and `apps/web/public/v4-hero-rocks.webp`; optimized outputs are saved in the project. `apps/web/components/hero-rock-layout.json` maps sprite bounds to original scene positions. The original hero artwork is retained for reduced motion and failure states.

Clean-plate prompt: “Remove only every floating asteroid/rock fragment from the supplied hero. Inpaint the adjacent starfield, Earth or existing orbit trail behind each removal. Keep the YF emblem, candlesticks, Earth, gold orbit rings, marble platform, composition, lighting and colors unchanged. No new objects or text; no motion blur.”

Rock-layer prompt: “Keep only the floating rock fragments from the supplied image, with their sharp silhouettes, black/blue stone texture and gold-lit facets. Remove Earth, emblem, candlesticks, orbit trails, platform, nebula and stars to genuine transparency. Preserve the full 1672×941 canvas and original rock scale and positions. No rearrangement, glow rectangle or painted checkerboard.” Generated positions were inspected and explicitly remapped to the approved scene positions.

Natural-rock checks: `scripts\pnpm.cmd build`, `scripts\pnpm.cmd lint` and `scripts\pnpm.cmd typecheck` passed. `scripts\pnpm.cmd test` passed 53 tests, including transparent sprite-bound validation; `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts` passed 14 responsive/motion/fallback checks. The linked WebM preview was refreshed with this version.

Current source: `apps/web/components/hero-art-renderer.js`, built to `apps/web/public/hero-art-renderer.js`. It embeds only the approved public artwork so file previews work, caps rendering at 24 frames per second and preserves image detail up to a 2560px canvas. No private portal, broker or authentication code changed. See [animation preview](previews/homepage-animation.webm).

Motion restoration verification: `scripts\pnpm.cmd build`, `scripts\pnpm.cmd lint` and `scripts\pnpm.cmd typecheck` passed; `scripts\pnpm.cmd test` passed 52 tests. `scripts\pnpm.cmd exec playwright test --config playwright.cinematic.config.ts` passed 14 checks, including actual rendered-pixel changes with ambient overlays suppressed, offscreen pause, reduced-motion pause, graphics-context loss and script-load failure. Screenshots in that suite use reduced motion deliberately; the WebM preview shows the running animation.

The renderer is authored in apps/web/components/earth-renderer.js and generated as apps/web/public/earth-renderer.js by scripts/build-cinematic.mjs. Its optimized public map is embedded so file:// previews work without cross-origin texture uploads. Rendering is capped at 24 draws per second and 1024px, and stops when paused or hidden. No account, admin or trading functionality changed.

Latest verification: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (49 passed); `pnpm exec playwright test --config playwright.cinematic.config.ts` (14 passed). Browser coverage checks all three independent motions, actual sphere rotation/pause, reduced motion, loss of WebGL context, asset failure, full-width layouts and portal smoke checks. Screenshots: docs/screenshots/desktop-v4-final.png and mobile-v4-final.png.

Older sections below record the asset and motion revisions; the current behaviour above supersedes their motion descriptions.

Generated using the built-in imagegen tool. Four 1536 x 1024 source images were inspected and converted to quality-92 WebP without resizing. Existing supplied logo and hero artwork are preserved. Generated charts are conceptual decorative illustrations, not market data.

Final assets:
- apps/web/public/v4-card-market.webp
- apps/web/public/v4-card-tools.webp
- apps/web/public/v4-card-signals.webp
- apps/web/public/v4-card-community.webp

Prompt set: Create one premium cinematic website card illustration. Landscape 3:2 composition. Photorealistic luxury 3D rendering, obsidian black and champagne gold, crisp detailed material, controlled dramatic lighting, subtle deep blue shadows. Subject concentrated in RIGHT two thirds, LEFT third almost black empty space for HTML typography. Edge to edge art, no frame, NO lettering, NO words, NO numbers, NO arrows, NO badges, NO watermarks, NO logos. This is a decorative marketing image, not real market data.

Subjects:
1. A dramatic obsidian mountain peak with delicate luminous gold contour paths winding up its ridges, precise gold candlestick-like sculptural accents, cinematic trading research metaphor.
2. A luxurious floating dark glass control console with four elegant gold mechanical sliders and tiny unlabeled controls, sophisticated risk management metaphor.
3. An abstract sculptural ascending and descending gold candlestick ribbon over black volcanic terrain, atmospheric fine gold light trails, purely conceptual trading analysis illustration.
4. A solitary figure wearing a black coat with a small abstract gold crown embroidery on the back, facing a monumental warm gold illuminated archway with distant community silhouettes.

Validation: pnpm build; pnpm exec playwright test --config playwright.cinematic.config.ts (six responsive projects, including image native-width checks); pnpm lint; pnpm typecheck.

## Premium hero revision

Built-in imagegen edit of supplied v4-hero-original.png. Saved as apps/web/public/v4-hero-premium.webp (1672 x 941; quality-94 WebP). Original retained.

Prompt: Preserve the YENGFX gold and silver wordmark identity, candle-shaped Y, crown silhouette, planet, orbital rings and luxurious platform. Improve crisp metal bevels, sharp rock textures, controlled highlights and sophisticated deep blue black shadows. Wide landscape composition. Pull camera back slightly: entire crown, orbit and platform visible with black breathing room. Main emblem on right two thirds; left quarter near-black for HTML. No headlines, buttons, UI, new words or watermarks. Sharp focal plane; no blur filter or hazy bloom.

## Full-width hero layout

The hero now spans the complete viewport width, including desktops wider than the old 1800px limit. Its artwork uses the source aspect ratio so the crown and platform remain in view on desktop. A subtle left overlay supports readable HTML text; mobile shows the complete composition above the copy. Both index.html and demo-preview.html are regenerated.

Validation: `pnpm build`, `pnpm lint`, `pnpm typecheck` passed. `pnpm exec playwright test --config playwright.cinematic.config.ts`: 7 passed, including a 2249px-wide desktop, full-width image bounds, desktop artwork ratio, mobile navigation, no horizontal overflow, and existing portal smoke checks.

## Homepage motion

Added hero-motion.js only to the public homepage and both file previews. The artwork drifts slowly through a maximum 1.8 percent zoom inside its existing full-width frame, gold particles rise, and the copy enters in sequence. No added WebGL runtime or animation-frame loop. A keyboard-accessible Pause animation button controls continuous effects. They also pause offscreen and when the tab is hidden. Reduced-motion preference disables artwork, particles and entrances, including preference changes while the page is open. The static page remains readable without JavaScript.

Checks: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (49 passed). Browser coverage via `pnpm exec playwright test --config playwright.cinematic.config.ts` includes active animation, keyboard pause/resume, reduced-motion fallback, mobile offscreen pause/resume, full-width geometry and existing portal destinations. No backend or trading behavior changed.

## Independent logo and rock animation

Replaced the flat-image camera effect with separately animated foreground objects. The clean planet and pedestal stay still; the transparent logo levitates and rocks drift and rotate on independent timelines. Six rock instances are used on desktop, four on phones. Pause/play, offscreen and hidden-tab pausing, and reduced motion apply to all layers. The original full hero remains visible until all assets decode, and remains the fallback if any layer fails. No backend or trading changes.

Created with built-in imagegen, inspected and saved inside the project:
- apps/web/public/v4-scene-background.webp (1672 x 941)
- apps/web/public/v4-scene-logo.webp (1672 x 941, transparent alpha)
- apps/web/public/v4-scene-rock.webp (1422 x 1106, transparent alpha)

Prompt set, using v4-hero-premium.webp as edit reference:
1. Clean background plate: Remove foreground crowned YENGFX wordmark, attached orbital swooshes, and airborne rocks. Inpaint with matching planet, starfield and distant golden vertical lights. Preserve planet and marble pedestal position, composition and lighting; retain pedestal light circles and floor. No logo, letters or foreground loops.
2. Logo cutout: Extract only the crowned gold/silver YENGFX wordmark and its orbital swooshes onto true transparent alpha. Preserve candle-shaped Y, crown, letters and full 16:9 canvas alignment. Remove planet, platform, floor, rocks and external candles. No tight crop or black background.
3. Rock cutout: One isolated jagged obsidian meteor rock with gold fissures and dark blue reflections, lit from lower right, centered on true transparent alpha; no surrounding scene or lettering.

Validation: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (49 passed), `pnpm exec playwright test --config playwright.cinematic.config.ts` (14 passed). Tests check independent logo/rock transforms, pause/resume, reduced motion, full-width layout, image-failure fallback and existing portal pages. Desktop and mobile screenshots inspected in docs/screenshots.

## Full logo turn and spinning rocks

The logo now completes a 360-degree Y-axis turn every 16 seconds while retaining its independent floating animation. A nested wrapper separates turning from levitation. Front and rear image faces prevent mirrored lettering on the reverse side. Rocks turn continuously in alternating directions at their individual speeds and continue drifting. This is a CSS perspective effect using transparent raster layers, not a volumetric 3D model. Pause, offscreen/hidden-tab handling, reduced motion, and missing-asset fallback remain supported.

Validation: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (49 passed); `pnpm exec playwright test --config playwright.cinematic.config.ts` (14 passed). Browser checks sample a Y-axis rotation matrix and verify pause across the spin and levitation layers. Inspected angled and reverse-side screenshots: docs/screenshots/hero-spin-angle.png and hero-spin-reverse.png.

## Correction: spin Earth, keep logo and rocks still

This supersedes the preceding logo/rock spin. Removed logo turntable and reversed face. Logo and rock transforms are now static. Earth has its own circular layer behind the logo, with a tiled surface moving horizontally under fixed rim and day/night shading. The decorative rotation loops every 90 seconds; it is a CSS globe effect, not a scientific globe model. The pedestal is protected by the Earth layer clipping region. Pause, reduced motion, offscreen/hidden-tab handling and original-image fallback are preserved.

Built-in imagegen assets, inspected and saved in the workspace:
- apps/web/public/v4-scene-starfield.webp (1672 x 941)
- apps/web/public/v4-earth-texture.webp (1774 x 887)

Prompts, referencing v4-scene-background.webp:
1. Remove only the large Earth/planet and halo; inpaint the surrounding blue-black starfield and nebula. Keep pedestal, floor, gold rings/lights and decorative vertical candles at the same positions. Same 1672x941 composition, no foreground logo or rocks.
2. Seamless horizontally tileable 2:1 equirectangular Earth surface map: recognizable continents, obsidian/navy oceans, dark metallic terrain, champagne-gold coastlines, city lights and fissures. Uniform lighting, no sphere rendering, sun, stars, rim, logo, text or borders. Match source color/material style.

Validation: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (49 passed); `pnpm exec playwright test --config playwright.cinematic.config.ts` (14 passed). Browser checks require Earth motion while logo/rocks remain stationary, and cover pause/reduced motion, fallback, responsive layout and existing portal destinations.

## Readability overlay

Added a stronger dark gradient and restrained edge vignette to the desktop hero, above the artwork layers and below the HTML copy. The gradient fades out across the centre to preserve the brighter logo and Earth on the right. Existing tablet treatment and mobile bottom fade remain in place. No blur, image changes or motion changes.

Validation: `pnpm build`, `pnpm lint`, `pnpm typecheck`; `pnpm exec playwright test --config playwright.cinematic.config.ts` (14 passed). Desktop screenshot inspected at docs/screenshots/desktop-v4-final.png.

## Rounded entry buttons and animation control removal

Header Enter Hub and hero action links now have rounded pill corners, with the earlier polygon clipping removed. Removed the pause/play button from both homepage exports and its JavaScript dependency, so automatic animation continues to work without a control. OS reduced motion and automatic offscreen/hidden-tab suspension remain supported.

Validation: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (49 passed), `pnpm exec playwright test --config playwright.cinematic.config.ts` (14 passed). Browser checks include rounded header styling, absence of the old control, active motion, reduced-motion stop/resume, WebGL and image fallbacks, and responsive portal smoke checks.

## White stars

Added a decorative aria-hidden white star layer to the public hero: 28 small stars with slow 6-10 second twinkles and four restrained cross-shaped sparkles. The main desktop copy area is avoided. Phones show fewer stars. The layer never intercepts clicks and pauses offscreen/when the tab is hidden; reduced motion hides it. Existing Earth rotation, logo float and rock drift remain intact. No new assets or runtime dependencies.

Validation: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (49 passed); `pnpm exec playwright test --config playwright.cinematic.config.ts` (14 passed), including decorative semantics, no pointer interception, active twinkle and reduced/offscreen handling. Inspected active-effect screenshot: docs/screenshots/desktop-v4-white-stars.png.
