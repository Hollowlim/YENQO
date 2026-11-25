# Membership and homepage effects

The approved plain HTML/JavaScript approach recreates the requested visual treatment without React, shadcn, Tailwind or a paid registry installation. These are custom effects, not the official React Bits Pro components. No license key or registry authorization header is needed.

Membership compares Free and Verified IB benefits using pixel-pattern edges that brighten on hover and keyboard focus. USD 100 is explicitly a qualifying broker deposit, not a subscription payment. The existing authenticated membership request, verification and revocation flows are retained.

The homepage now uses an accordion gallery instead of Scroll Stack, following the supplied AccordionGallery reference. Tools, Daily Analysis / Mapping and Educations panels expand on mouse hover, keyboard focus or tap. Analysis opens by default. Navigation uses separate links so tapping a panel does not immediately navigate. Collapsed content is inert and cannot receive keyboard focus. The desktop row becomes a vertical mobile layout, and reduced-motion users get immediate transitions. Decorative artwork uses local CSS patterns, with no external placeholder photos or additional dependencies.

Validation:

- `scripts\pnpm.cmd lint`: passed.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd build`: passed; exported 31 screens and validated 34 HTML files plus JavaScript.
- `.tools\node-v24.22.0-win-x64\node.exe scripts/with-local-database.mjs browser`: 9 passed across desktop, iPad and mobile. Covers accordion expansion, focus/tap, inactive content, reduced motion, horizontal overflow, registration redirect/password visibility, membership cards and approval/revocation. Fixtures use the isolated local database.

Screenshots are in `docs/screenshots/*-accordion-gallery.png` and `*-pixel-membership.png`.

MT5 trading remains disabled. No database schema, real membership approvals or client credentials were changed.
