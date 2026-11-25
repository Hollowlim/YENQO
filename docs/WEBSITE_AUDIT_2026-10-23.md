# Website and account audit — 23 October 2026

The current user and admin workflows were exercised with isolated test accounts on desktop, iPad and mobile viewport sizes. The configured Supabase connection and the main site's admin login/client directory were checked separately. Customer membership decisions were not changed. This is a functional audit of the implemented Phase 1 website, not a claim that the deferred integrations are implemented.

## Fixes delivered

- Members can edit their display name through Settings. The server validates the name, updates only the authenticated account, and checks the profile version against concurrent edits. Email remains fixed.
- A name-only change preserves verified membership. Changing broker/MT5 account details still invalidates verification and requires a fresh admin review.
- Added an optional server-side Resend password-reset transport. Keys stay private; the development mail outbox cannot be enabled in production. Missing configuration returns an explicit unavailable response.
- Reset requests enqueue bounded background work, keeping account lookup and provider response time out of the public response. Tokens are hashed, expire after 30 minutes and are single-use. Delivery failure removes the undelivered token. A logging failure after successful delivery does not invalidate the emailed link.
- Added a complete signup-to-approval-to-account-change browser journey. Updated video/editorial browser tests to use the isolated test server instead of the configured Supabase website.

## Flows checked

| Area | Verified behavior |
| --- | --- |
| Signup/login | Three signup fields, proceed to login, password show/hide, incorrect-password rejection, member login, admin username login, logout and private-route protection |
| Member details | Name/email display, MT5 account and deposit submission, pending state, name editing, account-change re-verification and profile concurrency/ownership checks |
| Admin verification | Client search, review dialog, verified account suffix/deposit checks, approval without a reason, revocation for MC/changed IB, refreshed entitlements |
| Membership access | Free access to publishing/Community; verified access to protected tools/lessons; revocation removes premium access |
| Mapping and signals | Admin manual publishing and visibility in the free member portal |
| Educations | MP4 upload, publishing, entitled video playback and server-side access checks |
| Community | Free member posting, replies/reporting and administrator hiding/moderation; API authorization and image access tests |
| Dashboard/Tools | Responsive calendar; unavailable account metrics and disconnected trading controls for real clients; no synthetic client trades |
| Pages | All 32 exported HTML screens render offline; server routes retain authentication and role checks |
| Password reset | Development outbox delivery, hashed token, reset once, replay rejection, login with new password, generic unknown-email response; production provider success/failure tested using a mocked transport |

Screenshots inspected: [desktop admin review](screenshots/desktop-audit-admin-review.png) and [mobile membership request](screenshots/mobile-audit-membership-pending.png). The screenshot accounts are synthetic test fixtures.

## Verification commands

Use the bundled Node executable if Node is not available on PATH. The local test database must be running; `with-local-database.mjs` refuses a non-loopback test database and disables external reset-email delivery.

| Command | Result |
| --- | --- |
| `scripts\pnpm.cmd lint` | Passed, zero warnings |
| `scripts\pnpm.cmd typecheck` | Passed |
| `scripts\pnpm.cmd build` | Passed; 32 complete HTML screens exported, 35 HTML files validated |
| `scripts\pnpm.cmd test` | 47 unit tests passed |
| `node scripts/with-local-database.mjs integration` | 59 integration tests passed |
| `node scripts/with-local-database.mjs browser --audit` | 36 browser tests passed across desktop, iPad and mobile |
| `node scripts/with-local-database.mjs delivery-server`, then `node scripts/with-local-database.mjs delivery` | One complete local reset-delivery test passed |
| `node scripts/check-supabase.mjs` | Connection, required client fields and private-table RLS checks passed |
| `node scripts/check-admin-memberships.mjs` | Main website admin login and client directory passed; no membership decisions changed |

The browser suite above is the current targeted audit suite. Older historical browser suites were not all rerun. Viewport tests use Chromium emulation, not physical iPads or Safari. The isolated database uses PGlite; the hosted Supabase checks were deliberately limited and did not repeat destructive fixture suites against customer data.

## Remaining launch work

1. Configure a verified reset-email sender and private `RESEND_API_KEY` / `RESET_EMAIL_FROM`, then test actual inbox delivery on the deployed HTTPS origin. No real provider email was sent in this audit. The current email queue is best-effort in-process: a restart can lose pending work and there is no automatic retry. Use a durable worker for reliable delivery at scale.
2. Deploy the Node server with HTTPS, correct origin/cookie configuration, private environment secrets, request/resource limits and monitoring. Opening an HTML file is a design preview; it cannot perform real signup/login or persist account changes.
3. Back up both the database and private video/image storage; provide persistent private storage on the hosting platform. Verify production recovery, access permissions and native device behavior.
4. Live Trade screen sharing, microphone streaming and room chat still need a real broadcast/signalling service. The separate support-chat preview is not a connected support service. Telegram integration and email verification/email-address changes are not implemented.
5. MT5/EA pairing, account telemetry, dashboard P/L history and broker commands remain unimplemented. Real client Tools correctly shows disconnected/unavailable data. No live trading was enabled.

Run the working website at **http://127.0.0.1:3000**. Both clients and administrators sign in at `/auth/login`; administrator accounts are routed to the admin portal. Existing credentials remain in private configuration and are not included in this report.
