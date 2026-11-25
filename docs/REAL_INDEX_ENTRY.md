# Real account entry vs offline demo

1 November 2026, Asia/Kuala_Lumpur. The owner clarified that `index.html` is for actual client/admin testing and `demo-preview.html` alone is the offline design demo.

- `apps/web/pages/index.html` now opens the running app at **http://127.0.0.1:3000/**. Its signup/login/membership/app links point to the real server. It does not carry the offline flag, role switcher or offline catalog.
- `apps/web/pages/demo-preview.html` retains the offline flag and explicit demo navigation. Its authentication forms remain disabled. It never grants a real member/admin session.
- Index probes only the existing public logo image before redirecting to the running app. If the app cannot be reached, it retains the homepage and displays a start/retry panel, with real server links. It does not send credentials across file origins, submit local forms, disable CORS protections, or silently redirect into a demo.
- Use `scripts\pnpm.cmd dev` from the repository root when the server is stopped. Browsers cannot safely launch the Node process automatically from an HTML file. A browser that blocks the readiness probe can still use the explicit Open website link.
- Actual pages, sessions, admin roles, ownership, membership verification and MT5 safety gates remain unchanged. Client/admin testing takes place on the HTTP app; `file://` documents do not authenticate users.

Implementation: the exporter keeps the offline demo, then produces a separate real index entry with `public/local-entry.js` / `local-entry.css`. Neither launcher asset is loaded by the actual HTTP homepage or private portals. The dev URL is specific to this local workspace; deploy the existing server application, not the local launcher as a static production homepage.

Verification: build, lint, typecheck and 65 unit tests pass. Six dedicated browser checks verify real entry routing and enabled HTTP login forms, stopped-server retry behavior, and disabled offline-demo authentication on desktop/mobile. Twelve V7 desktop/mobile presentation checks pass against the explicit demo file. The 87 protected portal/auth/export/render hashes and all six zero-difference private screenshot comparisons remain unchanged. The real local server was also checked without submitting accounts or credentials.

The dedicated entry browser harness intercepts local HTTP pages using actual rendered templates and allowlisted assets; it does not connect to production data or authenticate a fake user. Separate live smoke verification confirms the running local server's real login form and guest admin redirect.

`REAL_INDEX_ENTRY_BASELINE.json` records only the intentionally changed index export. Earlier V7/demo/public-render baselines are retained. See the historical [V7 implementation report](HOMEPAGE_V7_REPORT.md) for the visual design and backend regression results from that phase.
