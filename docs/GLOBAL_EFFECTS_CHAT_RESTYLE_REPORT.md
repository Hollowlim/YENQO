# Global effects and Community chat layout

Shape Grid and the shared card interaction script now load through the common HTML layout on all public, authentication, member and admin pages, including standalone exports. Error screens also include the grid. The former homepage-local grid was removed to avoid duplicate canvases. The background is fixed to the viewport with capped pixel density, pointer-safe layering, document visibility pausing and a static reduced-motion version.

MagicBento-style gold spotlight/border glow now applies to regular cards and stat cards as well as the homepage offering cards. Only visible cards are measured during pointer interaction. Existing interactive content keeps its native controls; effects do not intercept pointer events or add remote dependencies.

Community is restyled in a Telegram-inspired black-and-gold layout: desktop room sidebar, conversation header, incoming/outgoing bubbles, dates, timestamped admin badges, reply preview blocks, scrollable conversation and a composer below it. Narrow screens omit the room sidebar and retain the full conversation/composer. Native screenshot uploads, direct messages and live presence are not implied by the design.

The feed starts near the latest message and preserves scroll position when reading or loading older history. Near-bottom refreshes follow new messages; a reader above the bottom keeps their current scroll offset. Existing focus preservation remains. Posting, replies, removals, reports and membership policies remain server-enforced. This is a local shared room with visible-page polling, not a Telegram integration or WebSocket service.

Validation:

- `scripts\pnpm.cmd build`: exported31 screens and validated34 HTML files plus JavaScript.
- `scripts\pnpm.cmd lint`: passed, zero warnings.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`:26 passed.
- `scripts\pnpm.cmd test:integration`:31 passed.
- `scripts\pnpm.cmd test:e2e`:48 passed across desktop, iPad and mobile.
- After the final mobile composer sizing adjustment, `scripts\pnpm.cmd exec playwright test tests/e2e/community.spec.ts`:3 passed, including a check that Send stays above the mobile bottom navigation.

Browser assertions check a single initialized grid on every exported screen, grid readiness on connected authentication pages, own-message bubble styling and existing chat/permissions workflows at three viewport sizes. Desktop and mobile Community screenshots were visually inspected. No schema/auth/trading changes are part of this restyle.
