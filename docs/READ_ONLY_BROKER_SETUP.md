# Read-only MT5 history setup ? MetaApi

Current client method from 1 November 2026. Settings and P/L Calendar now use the server-side MetaApi adapter. The PC connector is stopped and disabled; its source and prior history are preserved. On 2 November 2026, the owner saved the private API token. The local website was restarted; an authenticated MetaApi server-directory lookup returned HTTP 200 with 11 matching JustMarkets MT5 servers, and the application connection endpoint returned available=true. No MetaApi trading account has been provisioned and no broker acceptance test has been performed. No Vercel deployment was made.

## Owner setup

1. Create your own [MetaApi account](https://app.metaapi.cloud/). Confirm its available regions, MT5 broker-server support, resource capacity and current usage charges before enabling connections. Start with an MT5 **demo account and its investor password**.
2. Create an API token in MetaApi. Provisioning requires account creation/deployment/deletion and history/account-information access. Use the narrowest provider permissions that support these operations. The application does not call trade endpoints; never add trade permissions as an application feature. Keep the token in server secrets, never chat, frontend JavaScript, `NEXT_PUBLIC_*`, source control or browser storage.
3. Back up the deployment database. With its existing `DATABASE_URL` configured securely, run from the repository root:

   ```powershell
   .\scripts\pnpm.cmd db:migrate
   .\scripts\pnpm.cmd db:generate
   .\scripts\pnpm.cmd build
   ```

   This includes `202611010001_read_only_broker`. It stores connection metadata and a bounded history snapshot, **no broker password or MetaApi token**. The required table is already present in the configured Supabase database and was checked read-only during this switch. No new schema migration or client-data mutation was needed for this task.
4. Configure these **server-only** variables (placeholders below), alongside the existing application settings:

   ```dotenv
   BROKER_READ_ONLY_ENABLED=true
   METAAPI_TOKEN=replace-with-your-server-only-token
   METAAPI_REGION=london
   METAAPI_ALLOW_REAL_READONLY=false
   PC_CONNECTOR_ENABLED=false
   ```

   Supported adapter regions: `new-york`, `vint-hill`, `london`, `singapore`. Choose a default actually available to your provider account for new connections. Existing account information/history requests use the provider account metadata region, validated against the same allowlist. Use HTTPS for a deployed `APP_ORIGIN`; HTTP is accepted only on localhost for development. Restart the Node server after changing configuration. Leave the flag `false` until migration and provider setup are complete.
5. Sign in as a verified test member. Save the exact broker name, MT5 login and broker server in **Settings**. Complete the existing IB + USD 100 membership review using actual broker records. Profile details alone do not verify ownership.
6. In **Settings → Read-only broker connection**, enter that MT5 account’s **investor/read-only password**, acknowledge the consent, then connect. The password is sent by the server to MetaApi for the managed connection; MetaApi receives and manages the broker credential. The app does not persist it. Never use the master/trading password.
7. Click **Sync history** after provisioning is ready. The server verifies provider-account identity, MT5 login/server/platform, connection state, `investorMode === true` and `tradeAllowed === false` before requesting history, and rechecks the provider identity and investor permissions after downloading it. Missing investor-mode confirmation fails closed. `ACCOUNT_TRADE_MODE_DEMO` is required initially. Real-account history requires a separately enabled server flag after demo validation; contest and unknown modes are rejected. A trading-enabled/unconfirmed/non-demo account is rejected and undeployment is attempted. Membership and saved profile are rechecked under database locks before results are committed.
8. Compare the calendar against the demo account’s MT5 statement, including entry/exit commission, swaps, partial closes and MYT midnight. Test disconnect/reconnect and membership revocation before inviting clients. A real MetaApi/broker acceptance test remains required.

## What the first version does

The JustMarkets MT5 server field offers suggestions automatically and prefills an already saved server. **Save selected server** uses the existing profile-save flow, including membership re-review when broker details change. There is no automatic guess of a member's assigned server. When MetaApi is configured, the app retrieves known MT5 names from its [server directory](https://metaapi.cloud/docs/provisioning/api/mtServers/getKnownTradingServers/). Otherwise, a small labeled reference list corresponding to JustMarkets' [Live/Live2/Demo/Demo2 WebTerminal routes](https://justmarkets.com/trade/web-terminal) is shown. These suggestions are not a connection-health check or an exhaustive list; clients can enter their exact server in Personal details if it is missing.

- Each verified member connects **their own single MT5 account**, matching saved profile details. Admin status grants no access to another member’s broker connection or trading powers.
- History uses MetaApi’s REST deal endpoint with pagination. It fetches the last 365 MYT dates plus today, at most 10,000 deal rows. Larger responses are rejected rather than silently truncated.
- The calendar shows a **saved read-only snapshot**, last-sync time and stale status after 15 minutes. Refresh is manual through **Sync history**, available both in Settings and on the Calendar. The open Calendar checks saved snapshot metadata once per minute; that polling does not call MetaApi. There is no unattended provider-sync scheduler or live streaming in this version.
- P/L is account-currency trading-deal cash flow: profit + swap + commission + fee. Deposits, withdrawals and balance adjustments are excluded. MYT is the calendar timezone, which can differ from the broker statement’s timezone.
- Win rate and average win/loss use only fully closed positions with complete entry/exit history. Open positions, incomplete histories and netting reversals are excluded from these statistics. Partial-close cash flow remains in the daily totals. This is not a tax/accounting statement or floating-equity calculation. Broker/provider retention limits may mean older history is unavailable.
- Account metadata, history and audit events are server-owned. The password input is cleared as soon as a connection is submitted; the request still carries it over HTTPS to the server and MetaApi. Provider diagnostics are sanitized. Every request uses the signed-in principal. Mutation-supplied user/account IDs are rejected; query-string IDs never select another account.
- Disconnect deletes the managed provider account and this website’s cached history. If creation times out before its remote ID is recorded, reconcile the `YENGFX read-only <user id>` account in MetaApi before removing/retrying the local connection. Retries reuse the same transaction key; do not provision duplicates manually.

## Operations and limits

Setting `BROKER_READ_ONLY_ENABLED=false` blocks new provider operations immediately after restart, but **does not undeploy already provisioned provider accounts or end their usage charges**. Disconnect/reconcile them through the app or provider first. Revocation blocks member sync and calendar access; automatic provider undeployment on membership revocation is not implemented, so the owner must handle provider cleanup. Existing cache retention follows account/connection deletion; there is no scheduled retention worker.

No Tools controls are enabled, and no MT5 order-management endpoint is added. EA pairing, command queues, trading confirmations, receipts and execution remain outside this integration.

## Primary references

- [MetaTrader authorization and investor access](https://www.metatrader5.com/en/terminal/help/startworking/authorization)
- [MetaApi account creation and transaction ID](https://metaapi.cloud/docs/provisioning/api/account/createAccount/)
- [MetaApi account-information fields, including investorMode](https://metaapi.cloud/docs/client/models/metatraderAccountInformation/)
- [MetaApi history deals endpoint and pagination](https://metaapi.cloud/docs/client/restApi/api/retrieveHistoricalData/readDealsByTimeRange/)


## This switch: verification and remaining work

- `scripts\pnpm.cmd build`: passed, 58 HTML files validated and 26 active exports generated.
- `scripts\pnpm.cmd lint` and `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`: 85 tests passed in 25 files.
- `scripts\pnpm.cmd test:integration`: 90 tests passed in 17 files, using disposable PostgreSQL and mocked provider transport. Includes ownership, revoked membership, in-flight revocation, provider failure, transaction-key behavior and stale snapshots.
- `scripts\pnpm.cmd exec playwright test --config playwright.settings.config.ts`: 15 checks passed at 1440, 834 and 390 pixels. Synthetic captures: [mobile connection](screenshots/account-settings/settings-mobile-metaapi-connection.png), [mobile calendar](screenshots/account-settings/settings-mobile-metaapi-calendar.png). No synthetic test values are shipped as live calendar data.
- Public homepage, auth, membership permissions, admin controls and unrelated portals retain their preservation hashes. Only the two member Settings/Calendar renders and exports have authorized hashes in `METAAPI_SWITCH_BASELINE.json`. No Resend configuration was changed.
- Local website refreshed successfully. Authenticated smoke checks returned Settings 200, the MetaApi form present, the PC form absent, MetaApi setup pending, and PC endpoints disabled. The owner deferred saving the provider token. The Supabase `BrokerConnection` table was confirmed read-only; there were no customer-record test mutations. The temporary owner smoke session was logged out.

Remaining before customer use: the token is now configured in the existing root `.env` with the London region, and the local website was restarted. Next, connect a genuine demo investor account, compare history against its MT5 statement, and confirm disconnect/provider billing cleanup. Do not paste the API token or investor password into chat. The local site may be tested before buying a domain. Vercel preparation/deployment remains a separate task; this change does not make local file storage or in-process email jobs deployment-ready.

Latest troubleshooting on 2 November 2026: [stopped account / region routing diagnosis and fix](METAAPI_CONNECTION_DIAGNOSIS.md). A member attempted a connection but no history was synced; that local connection was subsequently absent during the diagnostic. Reconnect through Settings; no additional API token is needed while the current token remains valid.
