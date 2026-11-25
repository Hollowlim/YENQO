# IB membership update

Implemented the user's membership amendment using plain HTML, CSS and JavaScript. Free members can view signals and manage their account or request verification. Full member access requires an approved JUSTMARKET membership under IB code `jai4w0w6` with a qualifying deposit of at least USD 100. This means a qualifying deposit, not a continuously monitored minimum balance.

The client main menu is Overview, MT5 Manager, Signals, Daily Mapping, Educations and Notifications. Membership and Settings are separate account links. Members under the IB code without the qualifying deposit remain signals-only. Strategy Lab, Backtesting and Journal are removed from the main client menu; their existing Phase 1 preview routes are retained.

Members submit a redacted reference and last four account digits. An administrator independently checks broker evidence, records the verified amount and explicitly approves the request. Claims alone never unlock access. Approval, rejection and revocation are audited and versioned; revocation removes access on the next request. No automatic broker verification or deposit processing is implemented.

The local administrator can sign in at `/auth/login` with username `YENGFX` and the password supplied by the user. Secrets remain in ignored local environment configuration; only password hashes enter the database. `pnpm admin:setup` configures an existing local ADMIN, revokes sessions and invalidates unused reset links. It cannot promote members and is disabled in production. Review requests at `/admin/members`.

Telegram login remains unconfigured. Full membership grants member screens only; it never grants administration or trading authority. Existing academy/journal/content screens retain their Phase 1 demonstration limitations. Live MT5 trading remains disabled.

## Verification

- `scripts\pnpm.cmd lint`: passed, zero warnings.
- `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`: 18 passed, including the six-category client menu and zero-deposit access denial.
- `scripts\pnpm.cmd test:integration`: 22 passed, including ownership, CSRF, policy thresholds, concurrent review, revocation, self-review denial and reset-token invalidation.
- `scripts\pnpm.cmd test:reset`: 1 passed against the development-only local mail outbox.
- `scripts\pnpm.cmd build`: exported 30 standalone screens; validated 33 HTML files and JavaScript.
- `scripts\pnpm.cmd test:e2e`: 30 passed across desktop, iPad and mobile viewports, including request/approval/revocation and offline navigation.

Screenshots in `docs/screenshots/*-membership.png` and `*-ib-review.png` contain synthetic test requests, not broker verification. Tests used the local PGlite fallback; real PostgreSQL deployment, native Safari/device checks, production email and Telegram remain outstanding.
