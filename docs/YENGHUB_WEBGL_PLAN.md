# YENGHUB — The Edge Is Earned: integration plan

Scope: upgrade the public homepage in place. Preserve all existing private routes, authorization, databases and demo/disconnected trading behavior. The current framework is native Node with editable HTML/CSS/JavaScript; no React/Next migration is needed.

Inputs read: `E:/YENGFX HUB/CODEX_PROMPT.md`, its cinematic `index.html`, current homepage/source, route renderer, CSP, project requirements/security/acceptance documents. `REFERENCE_TEMPLATE_PROMPT.txt` was not found under the supplied parent directory. The supplied HTML and latest user brief provide the available visual specification.

1. `apps/web/components/cinematic-scene.js`: reusable, locally bundled Three.js controller with beveled metallic Y, champagne lighting, liquid-metal background shader, particles and scroll camera motion. Cap render resolution/frame rate; pause offscreen/in hidden tabs; dispose resources; restore static branding when WebGL fails or reduced motion is enabled.
2. `scripts/build-cinematic.mjs`, package/lockfile: pin Three.js and bundle a classic script locally so file previews work without CDN imports. Preserve the same-origin CSP. Generated code is excluded from source lint/typechecking; the authored component is checked.
3. `apps/web/server/render.js`, `scripts/export-preview.mjs`: inject and allowlist the scene script only on `/`; support the standalone demo export. Private pages do not download the scene.
4. `apps/web/pages/index.html`, homepage-scoped CSS and existing chapter controller: title the experience YENGHUB — The Edge Is Earned; retain official logo, four chapters, real CTAs, feature gallery and membership requirements. Add decorative canvas with accessible static fallback. Animate text only when motion is permitted.
5. Browser/unit checks: render success/fallback/reduced motion, context loss, no private-page bundle, all chapter CTAs, no overflow at 1440/834/390, bounded pixel ratio and lifecycle pause. Run build, lint, typecheck and relevant tests. Do not create fake live prices, broker confirmations or account connection claims.
