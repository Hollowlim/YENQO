# Shared Community room

Implemented the owner's confirmed policy: every authenticated registered member can read Community; posting and replies require server-verified JUSTMARKET IB jai4w0w6 membership with a qualifying deposit of at least USD100, or ADMIN role. An admin role grants room moderation only, never authority over member trading accounts.

## Use

Open http://127.0.0.1:3000/app/community or choose Community in the workspace navigation. Admins also have Community moderation in their sidebar. Verified members can send a 1–2000-character message and an optional HTTPS chart link, reply to a visible message and remove their own messages. All registered members can report posts. Admins can reply, hide room posts and review paginated reports on the same page. Reports show whether the original has already been removed.

Messages are stored in the local database. The room refreshes roughly every ten seconds while visible, with error backoff up to one minute. Loading earlier history pauses polling until Refresh latest is selected. Posting failures retain the current draft and request key for safe retry. Enter adds a newline; sending requires the Send button. Keyboard focus on message actions is preserved through refreshes when possible. No messages or authenticated API calls are made by the direct-file preview; the composer is disabled there.

## Controls

- Session/principal checks on every API request; server derives author identity and role. Posting permission is rechecked per request. Free or revoked members retain reads but cannot post.
- Same-origin POST checks, streamed 8 KiB body limit, validated content and credential-free HTTPS links, rate limits (six new messages/minute; bounded request/report budgets).
- Author/request-key uniqueness and transactional audits prevent duplicate concurrent message creation. Reusing a key for different content returns409. A retry for removed content returns a tombstone, never its old body.
- Own-message removal is ownership-scoped. Admin hiding is reasoned and audited. Public feeds and report projections suppress removed text/URLs. Replies never contain a copied original body.
- Display names and message/reason bodies use textContent; arbitrary HTML is not rendered. Chart links are not fetched/embedded and open with noopener/noreferrer. No email/session/membership evidence is returned in messages.
- Stable cursor ordering with 50-item pages and matching database indexes. Foreign keys and uniqueness constraints cover authors, replies and reports.

Migration `202610200003_community` applied; Prisma client generated and schema validated. The independent read-only security review found no substantive actionable issues. Synthetic fixtures used in tests are deleted afterward; screenshots show only synthetic examples.

## Verification

- `scripts\pnpm.cmd exec prisma validate`: passed.
- `scripts\pnpm.cmd build`: passed; exported31 screens and validated34 HTML documents plus JavaScript.
- `scripts\pnpm.cmd lint`: passed, zero warnings.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`:26 passed.
- `scripts\pnpm.cmd test:integration`:31 passed, including nine Community scenarios.
- `scripts\pnpm.cmd test:e2e`:48 passed across desktop, iPad and mobile.
- After the final focus-preservation adjustment, `scripts\pnpm.cmd exec playwright test tests/e2e/community.spec.ts`:3 passed.

Screenshots: docs/screenshots/*-community-reader.png and *-community-moderation.png. The mobile Community screenshot was visually inspected.

## Remaining

No file/image uploads, private inbox, WebSocket delivery, push/Telegram notifications, automatic content moderation or member bans are implemented. “Share” currently means text and an optional chart URL; arbitrary files cannot be sent. Native browser prompts collect removal/report reasons. Drafts persist only within the current page session, not across reloads.

Real PostgreSQL production concurrency, data retention/deletion policy, backup/restore and deployment operations remain unverified; tests use the existing local PGlite fallback. Soft-removed original bodies remain in database storage, although APIs suppress them. Membership eligibility is independently admin-attested, not verified by an automatic broker connection. Live MT5 trading remains disabled.
