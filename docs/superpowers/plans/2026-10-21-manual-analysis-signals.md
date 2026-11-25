# Manual analysis and signal publishing

Scope confirmed: all registered members read manually published daily analysis and signals. Admins type a dated game plan/description and select BULLISH, BEARISH or SIDEWAY. Signals carry side, Scalping/Interday label, zone range, SL and TP1–TP3. No automated recommendations, broker operations or target-hit claims.

Execute inline: add dated DailyPlan and ManualSignal models with content status/version, creator FK and indexes. Preserve drafts from member queries; publish/archive explicitly. Validate date, positive bounded decimal strings and directional price ordering. Use same-origin, bounded JSON, rate limits, session ADMIN guards and transactional conditional-version writes/audit snapshots. Signal create keys prevent duplicate retries.

Add authenticated content-read APIs with date/cursor queries and admin list/save APIs. Restore Signals navigation/free route, leaving old sample detail links redirected to the actual list. Admin Mapping/Signals pages become real forms. Member Mapping loads today's Kuala Lumpur plan, supports historical date selection and preserves the TradingView chart; Signals shows published manual levels with timestamps and filters. Offline previews disable writes and never pretend to contain live published records.

Add integration tests first for role boundaries, draft isolation, creation/publishing/archiving, invalid fields, conflicting versions, idempotent create and XSS-as-text projections. Browser-test admin form-to-free-member publication plus archive and safe rendering across three viewports. Apply migration with web process stopped for Windows Prisma DLL regeneration. Run schema validation, build, lint, typecheck and relevant suites; document limitations.
