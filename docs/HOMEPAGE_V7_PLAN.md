# Homepage V7 implementation plan

31 October 2026. Read the project AGENTS, README, product requirements, EA security and acceptance rules before editing. The supplied ZIP contains one approved composite screenshot and three detail crops; it contains no reusable source, 3D model or actual Academy catalog. Extracted visual references live in `references/homepage-v7/`.

The existing app is native Node/Prisma with plain HTML/CSS/JavaScript. `/` previously used `templates/launch-home.html`; authenticated routes use the independent clean portal shell. `render.js` is the route/template boundary. The most recently approved monogram is `public/yengfx-mark-2026.webp` (transparent gold/silver YF), not the older crowned full wordmark.

1. Add `templates/homepage-v7-layout.html` and `homepage-v7.html`: public-only document/sections matching the reference hierarchy. Retain the earlier homepage variants. Do not alter private templates.
2. Add `public/homepage-v7.css`: isolated fonts, tokens, spacing, typography, hero layers and responsive layouts. No shared/global portal stylesheet edits.
3. Add `public/homepage-v7.js`: compact keyboard-accessible menu, Academy horizontal navigation, restrained entrances and pausable CSS depth motion. Use the approved emblem as an image plane; no invented 3D geometry or extra WebGL runtime. Static fallback works without JS, on reduced motion and lower-powered devices.
4. Make minimal public route/asset-selection changes in `server/render.js` and relative asset mapping in `scripts/export-preview.mjs`. CTA `/app` relies on existing server auth/entitlement redirects; do not redesign auth or add a public private-data API.
5. Capture the actual existing member layout with `scripts/capture-v7-workspace.mjs`. It is an explicitly illustrative offline account, not a live feed. Use existing approved artwork for planned curriculum illustrations.
6. Preserve Beta 1 module gates: Mapping, Signals and Community remain unavailable; Tools remains Coming soon. Show roadmap states without links into deferred routes. No Telegram community CTA, as previously requested. Academy curricula are labeled planned, not fabricated published courses/counts; the real lesson library stays behind existing verified membership authorization.
7. Verify 1920/1440/1024/834/390 layouts, keyboard/menu/carousel, touch targets, reduced motion, no-JS content, honest availability and working links. Hash private source/exports and rendered pages before/after, and compare client/admin screenshots at desktop/tablet/mobile. Run lint, typecheck, unit tests, HTTP/auth checks and build.

`V7_PORTAL_PRESERVATION.json` and the six `docs/screenshots/v7/*-before.png` files were captured before implementation. This workspace has no available Git metadata; preservation is verified by byte hashes and pixel comparison rather than a Git diff.
