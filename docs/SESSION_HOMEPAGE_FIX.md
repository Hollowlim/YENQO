# Login persistence when returning to the homepage

The public homepage previously received no authenticated principal, so it always displayed guest login/signup links. Signed-in visits to the login/signup pages also showed their forms. This appeared to lose the login even while the cookie/session could remain valid.

The HTTP server now checks the existing HttpOnly session on `/`, `/auth/login` and `/auth/register`. Valid sessions bypass login/signup and return to their authorized destination: free members to Membership, verified members to the member overview, admins to Admin. The homepage keeps its design and changes only existing entry labels/targets to My portal / Admin portal / Open portal. The guest and standalone preview output, public CSS, animations and templates remain unchanged.

No new login token, client-side identity flag or local-storage authentication was introduced. Navigating through the homepage neither deletes nor rotates the session nor extends its expiry. Only the existing explicit same-origin sign-out endpoint revokes that session. The existing 24-hour expiry and password-reset session revocation remain enforced. Forgot/reset-password pages remain accessible without the signed-in redirect. Role and member-data checks still run on the backend. Personalized responses retain `Cache-Control: no-store`.

Verification passed:

- `scripts\pnpm.cmd build`: 58 HTML files validated / 26 active exports.
- `scripts\pnpm.cmd lint` and `scripts\pnpm.cmd typecheck`.
- `scripts\pnpm.cmd test`: 87 tests / 25 files, including guest/homepage preservation and authorized portal entry targets.
- `scripts\pnpm.cmd test:integration`: 94 tests / 18 files. New HTTP checks cover the same session and expiry after homepage visits, correct login/signup redirects, query-string identity spoofing, unknown/expired cookies, password-recovery access, CSRF rejection and actual sign-out revocation.
- `scripts\pnpm.cmd exec playwright test --config playwright.session.config.ts`: 3 checks at 1440/834/390; each exercises actual login, logo→homepage→portal, login/signup bypass, retained cookie/expiry and explicit sign-out for free, approved and admin accounts.
- `scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts`: 2 checks preserving actual signup/login, client/admin profile and photo persistence, membership approval/revocation and access gating.

Database mutations in the suites use disposable local fixtures only. The original preservation manifests remain intact; `SESSION_NAVIGATION_BASELINE.json` permits only the authorized server entry-point change. No broker operation, MetaApi activation, Resend configuration change or Vercel deployment is included.
