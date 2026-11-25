# Acceptance checklist per phase

Phase 1 UI
[ ] All public/member/admin routes render, with accessible navigation
[ ] Desktop 1440 / tablet 834 / phone 390 usable without horizontal overflow
[ ] Demo/placeholder data conspicuously marked
[ ] Auth/login/reset flows run and roles enforce pages
[ ] Basic tests, lint, typecheck, Playwright smoke checks pass

Phase 2 Content
[ ] Admin publishes, edits, archives signals and mapping
[ ] Member access gated by subscription entitlement
[ ] Audit timestamps and timezones, user-visible signal revisions
[ ] Journal private to its author; academy progress works

Phase 3 MT5 read only
[ ] One-time pairing + revoke, hashed device secrets
[ ] Two members with two devices cannot cross-read
[ ] Account connection shows last update and offline/stale states
[ ] Accurate demo terminal snapshot, wrong account rejected
[ ] Position list updates and avoids false 'live' claim

Phase 4 Trading controls (demo ONLY)
[ ] Preview/confirm/queue/result states
[ ] Same command semantics from Telegram and Web
[ ] Idempotency prevents repeat close
[ ] Broker retcodes and partial fills represented
[ ] Security audit + negative abuse tests
[ ] Explicit no-live-trading release gate

Phase 5 Backtesting / Strategy
[ ] Formal indicator specifications/versioning
[ ] No metrics without data provenance
[ ] Cost assumptions, OOS test, no lookahead checks
[ ] Imports results with reproducible metadata
