# Paste this into Claude Code (VS Code)

Copy everything below the line.

---

Redesign the YENQO **member portal** UI to be simpler and more user friendly. The approved visual target is `docs/ui-redesign/member-home-mockup.html` — open it and match its layout, spacing and wording. Read `AGENTS.md` and `docs/BETA_1_LAUNCH_SCOPE.md` first; their security and "never fake live data" rules still apply.

Keep the stack: plain HTML templates + CSS + browser JS. Do not touch server auth, routes, APIs or the public homepage (`homepage-v7*`). Reuse the tokens in `apps/web/public/yenqo.css` (`--yq-*`). Do not add dependencies.

## Changes

1. **Sidebar** — `apps/web/templates/portal-member-navigation.html`
   - One flat list, always visible: Home (`/app`), Trading tools, Academy, P/L calendar, News, Discussion rooms.
   - Small "Account" group below: Membership, Settings. Remove the collapsible `<details>` account menu.
   - Home must be first (today it is hidden at the bottom of the collapsed Account menu).
   - Show a "Locked" badge on Academy when the member is not IB-verified (use whatever flag the server already passes to the template; if none exists, leave the badge out and tell me).

2. **Top bar** — `apps/web/templates/portal-layout.html`
   - Show the page title, the "Demo · not live" pill, and a notifications icon button.
   - Keep only ONE sidebar toggle: hamburger on screens ≤ 820px, none on desktop (there are currently two identical icons).

3. **Mobile bottom nav** — same file
   - 5 items with icons: Home, Tools, Learn (Academy), P/L, More (opens the sidebar drawer).
   - Drawer: closes on Escape, on outside click, and moves focus into it on open. Touch targets ≥ 44px.

4. **Home page** — `apps/web/templates/portal-member-overview.html`, top to bottom:
   - Greeting + one sentence saying what to do next.
   - **Getting started checklist** (4 steps, progress bar): Create account (done) → Apply for membership → Connect MT5 (read-only) → Try the lot size calculator. Each undone step has one button. Mark steps done from real server state only; if a state is unknown, show it as not done.
   - **3 status cards**: Membership, MT5 account, Next lesson — plain words ("Not verified", "Not connected", "Locked") with one link each.
   - **Quick actions** grid: Lot size calculator, P/L calculator, USD news, Discussion rooms.
   - Two panels: the existing TradingView XAUUSD widget (keep the current loader/retry code and `data-*` hooks), and "This month's P/L" with an empty state that links to Connect MT5.
   - **Remove** links to deferred modules (Mapping, Signals, Community), the "Legacy" / "01 / RESEARCH" eyebrow labels, the "Daily preparation" list, the duplicated MT5 "Unavailable" metrics, and the signals/analysis briefing panels.

5. **CSS** — put new styles in `apps/web/public/yenqo.css` (already loaded last). Delete rules in `portal-clean.css` / `v6.css` that only served removed markup; don't leave dead CSS.

6. **Whole website, same look** — after Home works, apply the mockup's style to every member page in `apps/web/pages/member/` that is live in Beta 1 (Tools, Academy, P/L calendar, News, Rooms, Membership, Settings, Notifications), plus the login/signup pages (`auth-clean.css`):
   - Same page header (title + one-line "what this page is for"), same card style, same buttons.
   - The "cool" layer from the mockup: soft gold glow in the page background, gradient-gold title on the main heading, glass-style cards, glowing gold primary button and progress bars, gold hover glow on clickable cards. Put it once in `yenqo.css` as shared classes, not per page.
   - Every empty state says what's missing and has one button to fix it.
   - Keep each page's existing `data-*` hooks and JS working; only change markup/CSS.

## Rules
- Plain language. No internal version names (V2/V4/V6/Beta) in member-facing text.
- Never show fake prices, balances or P/L. Empty state when there is no real data.
- Accessibility: skip link, visible focus ring, `aria-current="page"` on the active nav link, landmarks, `prefers-reduced-motion`.
- Responsive at 1440, 1024, 834 and 390 widths.

## Done means
- `pnpm lint`, `pnpm typecheck`, `pnpm test` pass.
- Update any Playwright specs that assert the old member overview / navigation text (grep `tests/e2e` for "Your trading space", "Daily preparation", "Legacy Academy", `yq-account-menu`), then run `pnpm exec playwright test -c playwright.clean.config.ts` and `-c playwright.session.config.ts`.
- Screenshot `/app` at desktop and mobile and show me.
- Report every file changed and anything you couldn't do.

Do the member portal first. Ask me before redesigning the admin portal.
