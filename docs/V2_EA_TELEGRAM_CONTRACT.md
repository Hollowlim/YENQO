# Future EA and Telegram contracts — not active endpoints

The V2 Trade Manager runs a pure local simulation. The routes below are a proposed later-phase contract, not implemented execution APIs. Browser-side demo receipts never prove broker execution.

## Read-only pairing first

1. Authenticated owner requests a short-lived, single-use pairing code. Server checks the principal, rate limit and consent. Store device secrets hashed, never return them through HTML or logs.
2. The owner's EA claims the code over outbound HTTPS, presents observed broker/account/server, and waits for owner confirmation. Do not collect broker passwords in the website.
3. Only that owner can read snapshots. Include device ID, opaque account ID, symbol, sequence, source timestamp and freshness. Disconnected/stale telemetry must stay visible. Admin roles do not confer account ownership.
4. Test cross-account isolation, replay, revoked secrets, out-of-order/stale snapshots and offline behavior before real telemetry rollout.

## Proposed command lifecycle

| Future operation | Request / validation | Result |
| --- | --- | --- |
| POST /api/accounts/:id/previews | Session principal owns account; selected device/symbol/tickets, action, exact-price or pip inputs, eligible volume and fresh snapshot | Server-calculated preview ID, state version, expiry, expected volume, warnings and exact target scope |
| POST /api/previews/:id/confirm | Same owner; explicit confirmation, unique idempotency key, unexpired/unconsumed preview; strong confirmation for Close All | Durable authorized command with QUEUED status; not success |
| Device claim lease | Device-specific credential, matching account/server/symbol/scope, command lease/expiry | One leased command; no public polling or global customer queue |
| EA execute | Verify account/mode, hedging/netting, position eligibility, lot steps/minimums, stop/freeze distances and broker retcodes | Broker result with actual deals/tickets, executed volume/prices and partial/failure details |
| Device ACK / reconcile | Signed authenticated device result; matching lease and command ID; durable deduplication | Stored receipt; only broker-supported results can be labelled completed/profit realized |

Telegram must call the same authorized per-owner backend; it cannot bypass preview/consent or directly expose a localhost bridge. Link Telegram through a short-lived verified handshake, not a typed username.

Secure percentages target eligible **open lot volume**, not guaranteed P/L. BUY higher entries first and SELL lower entries first; losing layers, mixed volumes, minimum residual lots and hedging/netting need explicit validation. An ambiguous timeout must trigger reconciliation rather than a blind close retry.

Keep trading disabled until separately authorized, security-reviewed, MT5-compiled, tested on broker DEMO accounts, isolated between two users/devices and covered by audit/kill-switch behavior. See `SECURITY_AND_EA.md` for existing release gates.
