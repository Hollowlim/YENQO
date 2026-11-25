# YENQO cloud MT5 architecture (plan — not deployed)

Status: **design only.** No managed terminal, no EA host and no order path exist. `/api/ea/commands` validates, audits (`EA_COMMAND_REJECTED`) and rejects every request. Do not enable execution until a separately tested and authorized deployment stage.

## Goal
Clients use YENQO from any browser (Windows, macOS, iOS, Android, tablets) without installing MT5, an EA, Python or a local bridge. MT5 only; no MT4/cTrader.

## What already exists and is reused
| Need | Existing piece |
| --- | --- |
| Select broker + MT5 server, authorize, disconnect | `templates/broker-connection.html` + `/api/broker/*` (MetaApi, read-only investor password, server-side only) |
| Server list per broker | `server/broker-servers.js` (JustMarkets reference list) |
| Per-user isolation | Every route resolves the account from the session principal; no client `userId`/`accountId` is accepted |
| Audit | `AuditEvent` table |
| Integration boundary | `server/ea-routes.js` (`/api/ea/status`, `/api/ea/commands`) |
| News guard | `server/news-guard.js` (UNKNOWN → treat new entries as paused) |

## Target components (to build)
1. **Terminal pool** — isolated MT5 terminals (one per account, or a provider such as MetaApi's managed cloud), on hardened Windows VPS or the provider. No inbound ports; terminals reach YENQO via outbound TLS only.
2. **Secret store** — trading passwords encrypted with a KMS-held key (envelope encryption), decrypted only inside the terminal host. Never in browser storage, logs or the web DB in plaintext.
3. **Command queue** (Postgres, later Redis if needed): `preview → explicit user confirm → authorized queue → device claim lease → EA executes → broker result ACK → stored receipt`. Idempotency key per command, expiry, lease TTL, retries that are safe against double fills, disconnection detection, account/symbol/scope validation.
4. **EA host** — the existing MQ5 EA, unchanged semantics (inspect source before porting; secure-profit percentage = portion of eligible volume, BUY higher entry first, SELL lower entry first).
5. **Market data** — a licensed feed for the chart; until then the chart stays labelled DEMO.

## Tenancy and authority rules
- A member controls only their own linked account. Admins and mentors never gain trading authority over a client's account; admin role covers content, roles and moderation only.
- Joining a Discussion Room shares only display name.
- Prop-firm accounts: onboard only where the firm's current terms explicitly allow third-party cloud access and automation.

## Before enabling execution
Demo-account end-to-end tests, double-fill/retry tests, retcode handling, volume-step and netting/hedging tests, kill switch, security review, and regulatory review for Malaysia.
