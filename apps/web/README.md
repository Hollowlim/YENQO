# YENGFX HUB Premium V2

The public homepage now uses the approved V7 design. Its source is `templates/homepage-v7.html` and `homepage-v7-layout.html`, with isolated `public/homepage-v7.css` / `.js`. See [V7 screenshots and validation](../../docs/HOMEPAGE_V7_REPORT.md). Client/Admin pages retain the existing clean portal design.

**Current Beta 1:** Market Analysis / Mapping, Signals and in-app Community are deferred. Their old HTML files remain archived on disk, but are omitted from active navigation/catalog and return 404 on the running app. No Telegram community button is included. See [release scope and test results](../../docs/BETA_1_LAUNCH_SCOPE.md).

**Double-click `pages/index.html` for real client/admin testing.** It opens the running application at http://127.0.0.1:3000/; signup and login use actual account permissions. The server must be running (`scripts\pnpm.cmd dev` from the repository root). If it is stopped, the entry page shows a retry/start message. **`pages/demo-preview.html` is the offline design demo only**: its Client View/Admin View switches do not sign anyone in or grant authority. Select Explore all categories there to inspect offline layouts.

| Category | HTML file/folder |
| --- | --- |
| Home | `pages/index.html` |
| Dashboard | `pages/member/overview.html` |
| MT5 / device setup / receipt | `pages/member/mt5.html`, `devices.html`, `receipt.html` |
| Signals / Daily Mapping / Community | Deferred; preserved HTML is an archived preview, not an active release module |
| Strategy / backtesting | `pages/member/strategy.html`, `backtesting.html` |
| Academy and lessons | `pages/member/academy.html`, `lesson-*.html` |
| Journal / membership | `pages/member/journal.html`, `membership.html` |
| Notifications / settings | `pages/member/notifications.html`, `settings.html` |
| Login / registration / reset | `pages/auth/` |
| Admin categories | `pages/admin/` |

Offline navigation, menus, FAQ and signal filters work. Offline auth forms are disabled and do not submit credentials. All preview profiles are fictional; no account is signed in.

For real signup, login, reset and server role guards, start the database and web server using the root `scripts\pnpm.cmd db:local` and `scripts\pnpm.cmd dev` commands in separate terminals, then open http://127.0.0.1:3000. Private accounts require the server and are never authorized from an HTML file.

Academy video CMS and membership/profile services are implemented. Journal saving, lesson progress, notifications, payments, device pairing and MT5 execution keep their existing prototype/unavailable states. Tools is Coming soon; real broker trading is disabled everywhere.

Edit page content between `<!-- PAGE CONTENT START -->` and `<!-- PAGE CONTENT END -->` in each HTML file. Those same contents are used by the server. Shared navigation/layout live in `templates/`; styles are in `public/styles.css`, and browser functions are in `public/app.js`. After shared layout/navigation changes, run `scripts\pnpm.cmd preview:export` from the repository root to update all offline documents. It preserves the editable content markers and never reads the database or `.env`.

## V2 additions

Trade Manager now offers an explicit local simulation. Live Chat is a local support prototype; Strategy Lab and Backtesting save research settings locally. The existing authenticated CMS, memberships and videos remain separate. See [V2 delivery details](../../docs/PREMIUM_V2_REPORT.md). Never rerun `scripts/upgrade-v2-pages.mjs` on edited pages; use `scripts\pnpm.cmd build` to refresh the 32 previews.
