# Manual Daily Analysis and Signals

Open the running local app at http://127.0.0.1:3000 and sign in with your configured administrator account.

- `/admin/mapping`: choose the plan date, enter a title and game-plan description, and select BULLISH, BEARISH or SIDEWAY.
- `/admin/signals`: enter title, BUY/SELL direction, SCALPING/INTERDAY style, entry-zone lower and upper prices, SL, TP1, TP2 and TP3. Notes are optional.
- Save Draft keeps content private. Publish makes it visible to registered members. Edit updates the record; Archive removes it from member queries.
- `/app/mapping`: members see the published plan for the selected date alongside the TradingView chart. The default date uses Asia/Kuala_Lumpur. Older selected dates are identified visibly.
- `/app/signals`: members see published manual signals and can filter by trading style.

Both viewing routes are available to all registered members, regardless of deposit verification. Tools and Educations still require verified JUSTMARKET IB membership plus a qualifying USD 100 deposit. Offline HTML previews cannot publish or retrieve private content.

## Security and correctness

Publishing requires a server-authenticated ADMIN role. Member queries return published records only. Origin checks, bounded request bodies and per-user rate limits protect writes. Conditional version updates reject concurrent stale edits; a unique request key prevents duplicate signal creation on retries. Each plan date has one record. Transactional audit records retain previous and submitted content.

Prices must be positive decimal values. BUY requires SL below the whole zone and ascending targets above it; SELL requires SL above the whole zone and descending targets below it. Text is rendered as text, including HTML-like input. Public records show publication/update times and revision numbers, without creator identifiers.

These are manually authored plans, not live market prices or indicator-generated recommendations. There is no automatic signal publishing, order execution, target-hit detection or claimed performance. No live MT5 trading is enabled.

## Verification

Commands use the repository's portable wrapper on this Windows machine:

- `scripts\pnpm.cmd db:generate`: generated Prisma client.
- `scripts\pnpm.cmd db:migrate`: applied `202610210001_editorial`.
- `scripts\pnpm.cmd exec prisma validate`: schema valid.
- `scripts\pnpm.cmd build`: exported 31 offline screens and checked HTML/browser JavaScript.
- `scripts\pnpm.cmd lint`: passed, zero warnings.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`: 26 passed.
- `scripts\pnpm.cmd test:integration`: 39 passed, including authorization, draft privacy, publication, archival, idempotency, invalid prices/dates, request bounds and concurrent edits.
- `scripts\pnpm.cmd test:e2e`: 51 passed across desktop, iPad and mobile, including admin publishing to a free member portal.

Screenshots in `docs/screenshots/` include manual-content browser-test captures. Test plan text and signal prices are synthetic fixtures, not market data. A separate read-only code review found no substantive actionable issues.

## Remaining limits

Content is plain text; image/file uploads and scheduling are not implemented. Members refresh or reopen the page to retrieve changes; there are no push notifications or automatic content polling. Audit snapshots exist, but a dedicated revision-history browser is not implemented. Local database checks used PGlite; deployment against production PostgreSQL remains a separate verification step.

This manual publishing feature supersedes the earlier decision to remove Signals. The research Pine indicator remains separate and does not publish client signals.
