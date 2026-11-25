# Instructions for Codex — YENGFX HUB

Read README.md, docs/PRODUCT_REQUIREMENTS.md, docs/SECURITY_AND_EA.md, and docs/ACCEPTANCE.md before coding. Use Figma https://www.figma.com/design/iJ3pndGzZkvJc2rlUcTyy5 as UI reference, not as runnable source. If Figma integration unavailable, use screen list in requirements and ask for screenshots instead of guessing critical behavior.

Priorities: security > correctness > accessibility > UI polish > feature count. Work incrementally and write tests. Do not fabricate market prices, signal win rates, verified backtests, successful broker operations, or live connection state. Distinguish mock, simulated, stale and live data visibly.

Every route that reads or mutates private data must check authenticated principal and server-side ownership; admin role only grants content/admin operations, NOT authority to trade users' accounts. Use secure defaults. Never bind authorization to arbitrary userId/client-supplied accountId. Use database constraints, scoped queries, audit logs, CSRF protections where applicable and rate limits.

Never embed real credentials, account passwords, Telegram bot token or device secret into source/client bundles. Gitignore .env and provide .env.example placeholders. No public unauthenticated command polling or port-forward of local MT5 bridge. Trading commands are disallowed in phase 1; mock demonstration requires conspicuous labeling.

Implement command lifecycle: preview -> explicit user confirm -> authorized server queue -> device claim lease -> EA executes -> broker result ACK -> stored receipt. Provide idempotency, expiry, retries safe against double fills, disconnection detection, and account/symbol/scope validation.

When unsure about existing Python bot / MQ5 semantics, inspect source; do not rewrite it from memory. Existing secure-profit percentage means portion of eligible volume, BUY higher entry first, SELL lower entry first; test mixed lots, netting/hedging, loss-making layers, volume-step limits, broker retcodes. Do not call actions 'profit secured' unless execution and P/L data support it.

Phase completion means lint, typecheck, relevant tests and page smoke checks pass. In reports cite exact test commands/outcomes and identify unimplemented features.
