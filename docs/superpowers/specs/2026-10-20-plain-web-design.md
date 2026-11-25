# Plain HTML, CSS and JavaScript migration

User explicitly requests removing Next.js in favor of familiar HTML and JavaScript. This overrides the earlier recommended frontend stack. Preserve all Phase 1 scope, Figma-derived visuals, auth sessions, role guards and no-live-trading constraints. C++ is not necessary for browser pages; do not add an unused native dependency.

## Implementation

Actual editable `.html` screen files in apps/web/pages, shared HTML shell in apps/web/templates, CSS and browser JavaScript in apps/web/public. A small native Node.js HTTP server in apps/web/server supplies the HTML, protects private routes on the server and handles the existing authentication API. No React, JSX, Next.js or frontend framework/build step. Maintain the PostgreSQL/Prisma schema and secure password/token semantics. Keep the browser/server dependency boundary explicit and serve only whitelisted public assets; private page templates and server source must never be public static files.

Use the existing verified rendered UI to preserve the Figma reference rather than inventing layouts. Copy no session, reset, environment or user-specific data into screen templates. Dynamic user strings must be escaped for HTML text and attributes. Server templates interpolate once, never recursively. Remove hydration payloads, inline handlers and executable inline scripts. Public pages can render without a database. Protected requests fail closed on unavailable auth storage.

Native browser JS handles menu disclosure, sign-out, signal filters and auth forms. Normal anchor navigation remains functional. Server origin checks, 8 KiB streaming body limits, rate limits, session expiry, reset replay defenses and audit events remain unchanged. Set a stricter CSP allowing only self-hosted scripts. Retain production Secure/HttpOnly/SameSite cookies.

## Verification

Keep existing security/auth/browser suites, update module paths, add tests for template escaping, source/static traversal denial, missing authentication and HTML delivery without framework scripts. Run syntax/type checks for JavaScript, lint, build validation, unit and HTTP integration tests, development reset delivery, and all three viewport browser checks. Preserve the original implementation under ignored .tools before removing the framework source. Document new edit paths and startup commands.
