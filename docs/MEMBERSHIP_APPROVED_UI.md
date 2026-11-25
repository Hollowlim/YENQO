# Membership page after approval

Approved members no longer see the Free / Verified IB comparison cards or the verification-request form. The access status and review reason remain visible. Pending/free/revoked members retain the cards and request form; an incomplete approval that fails existing IB/deposit policy still shows Review required. Admin access remains separate from IB approval and does not display the application form.

The server uses the existing authenticated principal and full-access policy to hide the sections before JavaScript runs. Browser state is refreshed through the existing own-membership endpoint every 30 seconds while visible and when returning to the tab. Superseded responses are ignored and focused form controls move focus to the status when the form is hidden. API errors show Status unavailable rather than presenting a new approval. This changes display only; server-side approval, revocation, IB/deposit validation, email notifications and entitlements are unchanged.

The Membership intro and summary now describe the current launch scope without promising deferred Analysis/Community or enabled trading. Original preservation baselines remain intact; `MEMBERSHIP_APPROVED_BASELINE.json` records only the Membership render, its HTML export and its browser script. The homepage and other portals remain unchanged.

Validation commands passed: `scripts\pnpm.cmd build` (58 HTML files / 26 active exports), `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck`, `scripts\pnpm.cmd test` (86 tests), `scripts\pnpm.cmd exec playwright test --config playwright.settings.config.ts` (24 checks), and `scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts` (2 checks). Browser tests use synthetic membership transitions or actual approval/revocation against disposable local test accounts; no existing customer membership is changed.

The MetaApi setup requested alongside this change is documented in [the quick start](METAAPI_QUICK_START.md); no token or broker password was supplied or activated in this UI task.
