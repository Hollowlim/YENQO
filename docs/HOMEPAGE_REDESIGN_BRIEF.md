# Homepage and client navigation amendment

The owner reports a new direction agreed with his boss: remove Signals from the product offering and focus on Tools, Daily Analysis / Mapping, and Educations. Feature the boss's actual logo on a more visually striking homepage. This supersedes the earlier six-category navigation direction.

## Proposed visual treatment

Keep the established obsidian and metallic-gold palette. Use the supplied logo prominently in the public hero and compactly in navigation. Build a spacious editorial hero with a large concise headline, restrained gold illumination and subtle motion that respects reduced-motion preferences. Follow with three clear destination cards, then a short membership explanation and final sign-in/join action. Make the logo, typography and spacing carry the design on desktop, iPad and mobile.

Suggested headline: “Read the market. Build your edge.” Supporting copy should describe tools, daily market analysis and education, without signal-performance claims. Keep third-party charts visually distinct from brand identity. Avoid illustrative account balances on the public homepage.

## Navigation and existing implementation

The proposed primary destinations are Tools, Daily Analysis / Mapping, and Educations. Home remains reachable through the brand/home link; Membership, Settings and Sign out remain account utilities. Tools initially means the existing disconnected MT5 tool workspace; the research indicator is not a validated client service. Any expansion of tool functionality needs an explicit feature definition.

Remove Signals promotions from landing/overview/navigation and category discovery. Existing saved links and authenticated redirects need a deliberate migration; do not simply hide a link while still routing free members to Signals. No indicator auto-publishing or live trading is part of this redesign.

## Information needed

- Actual boss/company logo: preferably SVG or transparent PNG. No logo exists under the current public assets; do not invent an official mark.
- Free-member destination/access: the old rule was signals-only. With Signals removed, the owner must select preview-only access or specify which remaining section is free. Existing IB + qualifying USD 100 verification must not silently grant or lose privileges.
- A visual reference is optional; absent one, use the proposed black-and-gold direction.

## Status

The owner selected free Daily Analysis / Mapping, with Tools and Educations requiring verified IB + USD 100 membership. This policy is implemented server-side and in login redirects, navigation and membership copy. Known old member Signals links redirect authenticated members to Mapping; Signals promotions are removed from the current landing, overview, main navigation and category browser. The archived Phase 1 preview documents are retained.

The homepage now uses the proposed black-and-gold visual direction: large headline, three offering cards and a membership section. The owner subsequently supplied the actual crowned YENGFX logo, now displayed in the hero and navigation with subtle motion. The former gold orbit is replaced by this logo. The background uses a plain-JavaScript adaptation of the supplied Shape Grid effect. Motion respects reduced-motion preferences. See LOGO_SHAPE_GRID_REPORT.md. No live trading or automatic client signals were enabled.

Validation: `scripts\pnpm.cmd build`, `lint`, `typecheck` passed; `test` 25 passed; `test:integration` 22 passed. Browser smoke checks cover all three viewport sizes, free Mapping, gated Tools/Educations, approval/revocation and old Signals redirects. Screenshots are in docs/screenshots.

`scripts\pnpm.cmd test:e2e`: 33 passed. After final visual/admin-card cleanup, `scripts\pnpm.cmd exec playwright test -g "public home|all admin shells"`: 6 passed. Desktop and mobile screenshots were visually inspected.
