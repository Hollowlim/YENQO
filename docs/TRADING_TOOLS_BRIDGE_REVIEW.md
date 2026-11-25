# Supplied MT5 bridge review — inactive reference

Reviewed `README_START_HERE.md`, `docs/ARCHITECTURE_AND_SECURITY.md`, `bridge/app.py`, the proxy scaffold and tests from `YENGHUB_Calculators_Readonly_MT5_Bridge_Kit.zip`. The kit was extracted into the ignored `.tools/trading-tools-kit/` review directory. Its standalone HTML and Next.js scaffold were not installed as application routes. No React, Next.js, paid API or MetaTrader5 package was added to the webapp.

## Current implementation

The existing `/app/mt5` page provides three local calculators and an explicitly disconnected MT5 tab. `GET /api/tools/mt5-snapshot` uses the existing server-side `currentUser(request)` session lookup, with per-principal rate limiting and no-store responses. It rejects account/member/bridge query selectors and all mutations. It returns **no account or position data**, no provider URL and no device credentials. The kit's `authenticatedMemberIdFromYourApp() -> null` stub is not shipped or replaced with a demo identity; the project's real session system is used instead.

There is no enabled user-to-device mapping or snapshot ingestion path in this feature. Until those exist and are validated, every signed-in member receives disconnected status. Administrators gain no authority to inspect or trade another member's broker positions. Existing PC connector and MetaApi code/data are preserved; MetaApi has been explicitly disabled in the local `.env` for this free version. The prior PC worker remains disabled. No provider account was created, deployed or removed by this integration.

## Findings in the supplied reference

- The bridge is disabled by default, binds to loopback in its launcher, requires a long bearer token and exposes no order method. Its account/login checks and rejection of `trade_allowed=True` are useful starting protections.
- The Python SDK operates against terminal state. A process-local lock is not a multi-member tenancy boundary. A shared terminal must not switch unrelated members' credentials; the existing single-PC job-switching alternative is not connected to this new UI.
- The supplied health route reports readiness from configuration, rather than a verified broker connection. Do not treat that as a live connection signal.
- `trade_allowed=False` alone does not independently prove the credential class. The supplied source also has no explicit demo-account-only acceptance gate. Investor access and demo mode must be verified before a real acceptance test.
- History is truncated at 2,000 deals. That is unsuitable for an authoritative P/L calendar without complete-range/pagination checks and visible completeness handling.
- The Next.js proxy is a single-member environment gate. It has no database device pairing, revocation, snapshot freshness validation or multi-tenant mapping. Its HTTPS-prefix test is not a complete private-destination/redirect policy. It was not exposed by this app.

## Required next phase

Use isolated per-member Windows MT5 devices/terminals that initiate outbound authenticated HTTPS to the YENGFX server, as required by `SECURITY_AND_EA.md`. Pair a device to the authenticated principal with an expiring one-use code; rotate/revoke hashed device credentials; verify the observed broker account and explicit read-only consent before activating the mapping. Resolve `session user -> active paired device -> approved account` exclusively on the server. Never accept a browser-supplied member ID, bridge destination or shared terminal selector as authorization.

Validate account/server identity, investor access, demo mode, finite/bounded snapshot fields, timestamps, replay/sequence behavior, revocation and membership policy on every receipt/read. Label stale or unavailable data. No bridge bearer token, investor password, master password or private endpoint belongs in browser code. Do not expose an inbound local port publicly. Keep trade execution absent.

Before enabling data, run two-member ownership/replay/revocation tests and compare a real isolated demo-account snapshot with MT5. This integration does not claim pairing, private TLS deployment, real broker data or production readiness.

## Supplied test results

The original kit's five Python tests passed in an isolated `.tools/readonly-bridge-tests/` virtual environment with FastAPI/HTTPX and mocked MT5. No MT5 SDK was installed, terminal initialized, service started or broker contacted. The tests cover missing/wrong bearer token, disabled/no-fabricated-data state, empty-token rejection, trading-enabled credential refusal and account mismatch. They do not cover deployment, TLS, pairing or real investor/demo authentication. The testing library emitted a Starlette/HTTPX deprecation notice; it did not affect the five results.

Primary references: [MT5 symbol contract/volume/currency properties](https://www.mql5.com/en/docs/constants/environment_state/marketinfoconstants), [broker-environment profit estimation](https://www.mql5.com/en/docs/python_metatrader5/mt5ordercalcprofit_py).
