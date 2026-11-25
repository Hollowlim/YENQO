# IB membership implementation plan

> Execute inline with the existing test-driven workflow. User supplied broker and IB code; no additional design handoff is required.

1. Write failing unit eligibility tests; add server-only policy/amount validation.
2. Migrate Membership/User/AuditEvent for verification state, username and auditable targets. New/existing unverified members default to signals-only.
3. Write HTTP membership/username tests before implementation. Add principal-scoped membership request/status endpoints and ADMIN review/list endpoints with origin, size and rate limits, optimistic versioning and audit.
4. Guard member routes by policy, adjust auth redirects and navigation. Add membership/request UI and admin review UI, retaining disconnected Telegram and MT5 controls. Refresh safe offline exports.
5. Bootstrap requested local admin credentials through ignored env/hashed DB only; adapt existing demo fixtures to distinguish free and synthetic verified access, never broker-verified production claims.
6. Run generation/migration, lint/typecheck/unit/HTTP/reset/browser checks, review security and document precise results/remaining external verification limitations.
