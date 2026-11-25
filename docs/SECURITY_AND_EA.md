# EA / Telegram integration contract & security gates

## Existing architecture
Legacy Telegram → Python aiohttp bridge (localhost:8080) → MT5 EA. This is single-owner/local and must NOT be internet-exposed or given one global queue to multiple customers. Preserve existing bot until a parallel migration is tested.

## New architecture
Web client → authenticated application backend ↔ PostgreSQL.
Telegram bot → signed backend adapter → same per-member authorized command service.
Member MT5 EA/companion agent on Windows PC/VPS → outbound HTTPS → device API for claim, snapshot, command polls, ack.
No broker password storage in webapp. Do not use client IP as authentication.

## Pairing
Authenticated member requests short-lived one-use pairing code; device/agent claims code via TLS; server rotates to per-device credential stored hashed server-side; member confirms observed broker/server/account; provide revoke and credential rotation. Replays and cross-member token use fail. Separate read-only consent from trading-enabled permissions.

## Suggested database
User, Session, Membership, Device, TradingAccount, DeviceCredential, AccountSnapshot, PositionSnapshot, Command, CommandExecution, AuditEvent, Signal, SignalUpdate, Mapping, Lesson, EnrollmentProgress, JournalEntry, StrategyDraft, BacktestRun, TelegramLink, NotificationPreference.
All tables with user data must be tenant-scoped and audited where appropriate.

## Command lifecycle (backend-controlled)
1. Authenticated user requests PREVIEW for explicit account, symbol/scope and typed command.
2. Backend validates ownership, device health, permitted trade scope, current snapshot age, min/max volume rules and entitlements; generates preview with expiry and risk warning.
3. User confirms preview. Backend records an idempotency key, durable command, expiry and audit event.
4. Paired device long-polls/HTTPS polls its own leased work. Claim must be atomically locked and tied to device identity.
5. EA verifies requested account number + server + symbol + exposure. Execute at most once, report broker retcode, ticket/deal IDs, actual volume and price.
6. Backend reconciles attempts, re-query account if uncertain, never blindly resubmits an ambiguous market close.
7. Both Telegram and Web read identical command receipts. Show pending vs broker confirmed accurately.

## Secure profit semantics
Percent = target percentage of eligible OPEN LOT VOLUME, not dollars of guaranteed profit. BUY layers: higher entry first; SELL: lower entry first. If minimum lot is 0.01 and eight positions are 0.01 each, 50% targets four lots. Clarify mixed-direction hedges, which positions are eligible, losing layers, partial close and volume steps. Broker-specific execution and stop rules must be enforced. Confirm before submitting.

## Safe release gates
A. Demo/mock UI only.
B. Read-only real telemetry after per-member pairing and isolation security tests.
C. Simulated actions with command receipts and 2-user cross-access tests.
D. Broker DEMO execution with explicit enabled flag, MT5 compile, freeze/spread/min-lot/hedging/netting cases, order-result retcodes and emergency kill switch.
E. Live trading only after separate approval, security review, audit, legal/compliance review, and clear member authorization.

## Critical negative tests
Cross-tenant account lookup/command fails. Forged device account ID fails. Expired/revoked/replayed pairing fails. Duplicate idempotency key does not create double trade. Backend timeout does not cause blind retry. Close All wrong account/symbol fails. Offline EA disables controls. UI labels mock data. Session expiry logs out cleanly.
