# Logo and Shape Grid homepage

Subsequent update: Shape Grid and card effects now apply site-wide. See GLOBAL_EFFECTS_CHAT_RESTYLE_REPORT.md; earlier homepage-only scope below describes the initial integration.

Used the owner's exact crowned gold/silver PNG from `E:/1d114152-4ed0-42f6-b6ca-41f04295a044.png`, copied without image editing to `apps/web/public/yengfx-logo.png`. It appears prominently in the homepage hero and in desktop/mobile brand navigation. Its original transparency and proportions are preserved. CSS adds subtle floating/perspective motion; reduced-motion disables it.

The user supplied React Bits ModelViewer and ShapeGrid integration prompts. The running app remains plain HTML/CSS/JavaScript, as previously requested. `shape-grid.js` implements a focused canvas adaptation of the supplied square-grid effect: diagonal drift, gold pointer highlighting and click ripple. It is not the complete React component and does not expose every ShapeGrid shape/perspective option. There are no new dependencies or remote runtime scripts.

The supplied PNG is a flat image. No GLB/GLTF/OBJ/FBX was supplied, so an actual 3D ModelViewer is not implemented. The subtle image presentation is not a 3D model or a fabricated replacement logo.

The grid is decorative, cannot block links, respects reduced motion and caps backing-store pixels/DPR. Animation pauses offscreen and when the document is hidden. Page cleanup disconnects observers. Logo requests use an explicit public asset whitelist and `image/png` content type. Existing private source and credentials remain inaccessible. Only the homepage loads the grid script; standalone exports use relative files and classic deferred scripts.

An image regression detected that a repeated HTML export could leave the connected hero with an offline relative image path. The renderer now restores the canonical public logo path on every connected render; a unit regression and real browser natural-width checks cover this.

Validation commands:

- `scripts\pnpm.cmd build`: exported 30 screens and validated 33 HTML documents plus JavaScript.
- `scripts\pnpm.cmd lint`: passed, zero warnings.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`: 26 passed.
- `scripts\pnpm.cmd test:integration`: 22 passed.
- `scripts\pnpm.cmd test:e2e`: 39 passed across desktop, iPad and mobile.

Browser coverage includes connected and direct-file UI, actual logo decoding, painted grid pixels, link interaction and a static canvas/logo under reduced motion across desktop, iPad and mobile. Screenshots: `docs/screenshots/*-landing.png`. Membership remains free Mapping, gated Tools/Educations under verified IB + USD 100; trading remains disabled.
