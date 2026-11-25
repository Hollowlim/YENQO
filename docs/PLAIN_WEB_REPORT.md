# Plain HTML / JavaScript migration

**Direct-file preview update:** all 30 HTML screens are now complete documents that work when opened from File Explorer. See [OFFLINE_PREVIEW_REPORT.md](OFFLINE_PREVIEW_REPORT.md) for the current export behavior and 27 browser-check results.

The user requested replacing Next.js with familiar HTML and JavaScript. The Phase 1 app now runs on a native Node.js HTTP server at **http://127.0.0.1:3000**. C++ is not required for browser pages, so no unused native subsystem was introduced.

## Delivered

- 30 editable HTML screens in `apps/web/pages/`, plus three shared HTML templates.
- Plain CSS and browser JavaScript in `apps/web/public/`; HTML and CSS updates need only a browser refresh.
- Native JavaScript server in `apps/web/server/`. No Next.js, React, JSX, Tailwind or frontend bundler remains in the application or its dependencies.
- Existing PostgreSQL/Prisma data and demo accounts retained; schema unchanged. Session/auth/reset security, role guards, rate limits and audit events preserved.
- Existing Figma-derived layouts and labeled demo data retained. MT5 remains disconnected with all eight trading controls disabled and no broker endpoint.
- Native menus, sign-out, auth forms and signal filters. Private screen templates are served only after authentication; backend source/environment files cannot be requested as static files.
- One-pass HTML interpolation with escaped dynamic profile strings. Scripts/styles are self-hosted files; stricter CSP disallows inline scripts and styles.
- Original source backed up under ignored `.tools/next-backup/` before removal. Historical Phase 1 report is marked accordingly.

## Verification

Commands use the local `scripts\pnpm.cmd` wrapper where a global pnpm installation is unavailable.

| Command | Result |
| --- | --- |
| `pnpm add -Dw prettier` | Installed formatter and updated lockfile; removed 188 obsolete dependency packages. |
| `pnpm build` | Passed: 33 HTML files plus server/browser JavaScript validated; no frontend compilation. |
| `pnpm lint` | Passed, zero warnings. |
| `pnpm typecheck` | Passed: JavaScript checked with checkJs, plus test/config types. |
| `pnpm test` | 11 passed, including HTML escaping and static whitelist checks. |
| `pnpm test:integration` | 14 passed: existing auth protections plus HTML delivery, strict script CSP and denial of private template/source/static traversal requests. |
| `pnpm test:reset` | 1 passed using the native development server and server-only reset outbox. |
| `pnpm test:e2e` | 21 passed against the native server across 1440, 834 and 390 pixel viewports. Screenshots updated. |
| `pnpm audit --prod` | No known vulnerabilities found. |

Tests were first run against the original implementation and failed on the missing plain-JavaScript asset and rendering helper; they pass against the replacement. JavaScript type-check findings were corrected. Formatting introduced normal whitespace in HTML buttons, so the browser test now identifies controls by normalized accessible names; signal filtering asserts visible articles rather than removed DOM nodes. No application protection was relaxed to make tests pass.

An independent read-only security review found no substantive migration regressions and separately verified oversized streamed-body rejection (413) through a native HTTP server.

## Unchanged limitations

Database verification uses local PGlite because Docker is unavailable; actual PostgreSQL concurrency remains unverified. Production email, CMS/journal/progress writes, payment integration, device pairing, MT5 telemetry/execution, Telegram and verified backtests remain deferred. No live trading, broker password collection, deployment or Phase 2 features were added. Browser tests emulate Chromium viewports, not physical iPad/Safari devices.

For editing, startup and demo accounts see [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md). Visual review: [desktop](screenshots/desktop-overview.png), [tablet](screenshots/ipad-overview.png), [mobile](screenshots/mobile-overview.png).
