# Admin membership approval and revocation

Sign-up shows display name, email and password only. Free members request full access from Membership by entering their MT5 account number and a qualifying deposit amount (USD 100 minimum). Broker and IB policy are displayed read-only. No receipt reference is required. Requests save the member's MT5 account to their own profile and remain PENDING without premium entitlements until independent admin approval. The supplied deposit is a claim, not a verified broker balance.

New registrations start with FREE membership. Open http://127.0.0.1:3000/admin/members, search for a client, then click their card or its Approve / Revoke button. A dialog shows only that client's review; it closes after a successful decision and updates the directory. Close or Escape dismisses it without saving. FREE members appear without submitting a membership request.

To approve, independently verify JUSTMARKET IB `jai4w0w6`, the client's MT5 account and a qualifying deposit of at least USD 100. Enter the verified account's last four digits, deposit amount and confirmation, then select **Approve membership**. Approval does not require a review reason. Revocation and rejection require a reason.

For an approved member, select **MC / account blown**, **Changed IB**, or **Other**, record the reason and select **Revoke access**. Premium access is removed on subsequent requests; the client retains free access. Reapproval requires a fresh verification. This does not close trades, change a broker account or delete the client.

MC and IB changes are manually reviewed. There is no automatic broker balance or IB monitoring. No live MT5 trading is enabled.

## Validation

- `scripts\pnpm.cmd test`: 32 unit tests passed.
- `.tools\node-v24.22.0-win-x64\node.exe scripts/with-local-database.mjs integration`: 58 integration tests passed, including direct FREE approval, verification requirements, MC and IB-change revocation, reapproval and concurrent review protection.
- `.tools\node-v24.22.0-win-x64\node.exe scripts/with-local-database.mjs browser`: 3 browser tests passed on desktop, iPad and mobile using isolated local fixtures on port 3001.
- `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck`, and `scripts\pnpm.cmd build`: passed. Build exported 31 previews and validated 34 HTML/JavaScript files.
- `.tools\node-v24.22.0-win-x64\node.exe scripts/check-admin-memberships.mjs`: running Supabase-backed directory passed; one registered FREE member was visible. No real membership decisions were changed.

Approval and revocation require authenticated admin access, same-origin requests and version checks. Profile edits invalidate existing verification; approval serializes with profile updates to prevent stale account verification. Decisions are audited. No database migration was needed.

Screenshots: [Desktop](screenshots/desktop-direct-membership-review.png), [iPad](screenshots/ipad-direct-membership-review.png), [Mobile](screenshots/mobile-direct-membership-review.png).
