# Direct HTML preview

The HTML files were originally content fragments, so opening them directly omitted their layout and assets. All 30 files under `apps/web/pages/` are now full styled documents with relative CSS/script links and offline navigation. Open `apps/web/pages/index.html` in Chrome/Edge and expand **Explore all categories** to browse every member, admin, auth and detail screen.

The offline documents use fictional preview profiles, visibly state that nobody is signed in and make no HTTP requests while browsing. Menus, FAQ and signal filtering work. Auth forms are disabled offline; no credentials are sent. MT5 trading and later-phase functions remain disabled.

`scripts/export-preview.mjs` produces the documents from the shared shell and editable PAGE CONTENT START/END regions. It reads no environment variables, sessions or database. `pnpm preview:export` refreshes exports; `pnpm build` also exports and validates them. The connected server extracts those same page contents, restores real application URLs from data-app-href attributes, and independently supplies its authenticated layout and principal. It does not trust the static preview shell/profile. Native source/template file URLs remain inaccessible over HTTP.

Current checks, all exit code 0:

| Command | Outcome |
| --- | --- |
| `scripts\pnpm.cmd build` | Exported 30 full documents; validated 33 HTML files and JavaScript. Repeated export also passed. |
| `scripts\pnpm.cmd lint` | Zero warnings. |
| `scripts\pnpm.cmd typecheck` | Passed, including export script and browser JavaScript. |
| `scripts\pnpm.cmd test` | 13 passed; includes content extraction boundaries and restoration of connected links. |
| `scripts\pnpm.cmd test:integration` | 14 passed against the connected app/database fallback. |
| `scripts\pnpm.cmd test:e2e` | 27 passed in 25.2 seconds. All 30 documents traversed through file:// at 1440, 834 and 390 widths; category links, filters, disabled offline auth and absence of HTTP requests verified. Existing connected auth/role/navigation/MT5 checks also passed. Settings assertions verify actual signed-in profile values. |

Independent read-only review found no actionable findings in the export changes. Screenshots: [desktop offline home](screenshots/desktop-offline-home.png), [mobile offline home](screenshots/mobile-offline-home.png).

Category file map and edit instructions: [apps/web/README.md](../apps/web/README.md). Production email, real PostgreSQL/Docker verification, CMS writes, journal saving, course progress, notifications, payments, device pairing and MT5 operations remain outside this delivery. No live trading or Phase 2 feature was enabled.
