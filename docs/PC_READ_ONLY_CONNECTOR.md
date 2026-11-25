> Superseded on 1 November 2026: the owner switched the client P/L flow to [MetaApi](READ_ONLY_BROKER_SETUP.md). The PC worker is stopped and its endpoints are disabled. This guide describes the preserved alternative.

# Owner-hosted Windows MT5 history connector

Implemented 1 November 2026. This is the current owner-selected connection method. **The connector is registered and online on this PC, waiting for a demo-account login. No real broker login or statement comparison has been performed; the owner chose to test later.** Real-account history acceptance remains disabled. There is no order-management implementation.

## First test

1. Keep this Windows PC awake, online and logged into the Windows account used for setup. The existing local website is running at http://127.0.0.1:3000.
2. Sign into your YENGFX member account. It needs the existing verified IB + qualifying deposit membership approval. Save the correct MT5 account ID and exact broker server in Settings; changing those details still requires membership review.
3. Open **Settings → Connect MT5 read-only**. Use an MT5 **demo account** and its **investor password**, acknowledge the owner-PC read-only consent, then connect. Do not paste passwords into chat or source files.
4. The form first shows a queued/waiting state. It only says history was synced after the authenticated connector has verified the account identity, rejected trading-enabled access and submitted an accepted history receipt.
5. Open **P/L Calendar**. Check the DEMO source label, last-sync timestamp, daily net P/L and totals against the MT5 statement, including commissions, swap, partial closes and MYT midnight. Normal polling is every 30 seconds, with a minimum 60-second refresh interval per account; broker startup or multiple accounts can take longer.

The beta connector supports **five active account links** on this PC. Each uses a separate portable terminal folder. This is a capacity guard, not a promise that every PC can run five accounts smoothly. Other clients do not need their own PC installation for this owner-hosted design.

There is **no MetaApi API subscription**. Your PC, electricity, internet, website hosting and database usage still have costs. This does not provide unlimited free hosted infrastructure.

## Start and stop

- Double-click `START_PC_CONNECTOR.cmd` to start the helper in the background. It refuses to create another instance when already running.
- Double-click `STOP_PC_CONNECTOR.cmd` to request a graceful stop. After a timeout it stops only the verified worker process and portable terminal processes whose executable paths are inside this project's private connector directory. It does not target your existing Program Files terminals or Telegram bot.
- Status: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/pc-connector.ps1 -Action status`.

The helper does not install an automatic Windows startup task or change the system-wide PowerShell execution policy. Keep Windows from sleeping while updates are needed. Closing the browser is fine; stopping/sleeping the PC stops updates. Status becomes offline after approximately two minutes without a worker heartbeat, and calendar snapshots are marked stale after approximately three minutes or an error.

The YENGFX helper retains supplied broker passwords only in its **running process memory**. After a helper restart, clients must submit them again. **MT5 itself may retain its local account configuration/credentials** inside the isolated terminal directories. These directories are restricted to the setup Windows user. Website disconnection revokes the app's history grant; the worker drops credentials and stops its owned terminal when it next polls. Reset the investor password at the broker if broker-level credential revocation is required.

## Setup on another Windows PC

Use an official MT5 installation, 64-bit Python 3.14 and this repository. From the project root:

```powershell
py -3.14 -m venv .tools/pc-connector-venv
.\.tools\pc-connector-venv\Scripts\python.exe -m pip install -r services/pc-connector/requirements.txt
.\scripts\pnpm.cmd db:migrate
.\scripts\pnpm.cmd db:generate
.\scripts\pnpm.cmd exec node scripts/setup-pc-connector.mjs
```

The default source is `C:/Program Files/JustMarkets MetaTrader 5/terminal64.exe`. A different official source path can be supplied as the setup script's first argument. The worker copies only the executable and optional broker server directory/license into `.private-pc-connector/terminals/<connection id>`; it never copies account databases, profiles or EAs from the source installation.

Setup generates a device token and RSA-4096 key pair. Only the token hash and public key are registered on the application database. The private runtime configuration is protected with Windows DPAPI **CurrentUser**, an owner-only directory ACL and gitignore rules. Nothing is printed that can authenticate as the worker. Run it under the same Windows login; copying its protected config to another user/PC is not supported.

Setup updates these local server variables, then the website must be restarted before the worker is started:

```dotenv
PC_CONNECTOR_ENABLED=true
PC_CONNECTOR_ID=generated-device-id
PC_CONNECTOR_ALLOW_REAL_READONLY=false
```

The current PC has already completed this setup. **Do not rerun setup for the first test.**

## Security and isolation

- Browser WebCrypto encrypts the password with RSA-OAEP/SHA-256 using a label bound to the connection ID, generation, nonce, login and server. The Node backend receives ciphertext, not a plaintext broker password.
- Ciphertext is a short-lived relay, expiring after two minutes. It is removed when claimed, or by expiration maintenance within roughly another minute while the application server is running. A lost/expired delivery requires re-entry rather than silently replaying old credentials.
- Worker polling/check/receipt endpoints require the device bearer secret, are scoped to its connector ID and are rate-limited. Admin cookies cannot impersonate a worker. The token is stored hashed on the server; the worker opens no listening port.
- Each account grant derives from the signed-in member and saved profile. Unknown user/account fields are rejected. Fresh membership/account checks run before broker work and again before accepting receipts. Leases, generations, versions and expiry reject duplicate/stale results.
- Before submitting any login, the Python worker verifies that the attached terminal installation **and data paths** match its isolated portable folder. Account ID/server and disabled trading permission are checked before and after history retrieval.
- MT5's `trade_allowed == false` can also describe a broker-disabled account; it **does not uniquely prove which password type was entered**. Users must provide investor passwords. The adapter contains no trading/order methods and rejects trading-enabled sessions on each read.
- Successful snapshots use broker UTC execution timestamps and account currency. P/L includes buy/sell deal profit, commission, swap and fee; balance adjustments/deposits/withdrawals are excluded. Position statistics use complete position history only. History is bounded to approximately one year and 10,000 deal rows; oversized histories fail instead of silently truncating.
- Source history is saved as a snapshot, with last-sync time based on the history window's end. It is never described as live prices. Unchanged history is not rewritten or re-audited as a new result each minute. Status polling avoids loading full deal payloads.
- Existing EA/Telegram source files were verified byte-for-byte unchanged. No public local-bridge endpoint, trade queue, order execution, client-position admin controls or Tools activation was added. Disconnecting/closing a connector terminal does not close broker positions.

## Revocation, rotation and publishing

Device revocation:

```powershell
.\scripts\pnpm.cmd exec node scripts/revoke-pc-connector.mjs
```

This disables its device token and fences all grants; the running helper stops when authorization is rejected. Do not re-enable a suspected-compromised token.

Replacement/rotation:

```powershell
.\scripts\pnpm.cmd exec node scripts/setup-pc-connector.mjs --rotate
```

The rotation script stops the verified helper, disables the previous device, revokes its grants, creates fresh keys/token, writes a new Windows-protected config and updates the local server device ID. Restart the website, then start the helper. Clients must reconnect. Actual rotation of the owner's newly provisioned device was not performed; token revocation/rotation behavior was tested against isolated fixtures.

Before publishing, configure the deployed backend with the matching `PC_CONNECTOR_ID`, enabled flag and the same application database. The worker must target the deployed **HTTPS** application origin; a localhost worker configuration will not automatically target a new domain. Configure the appropriate `APP_ORIGIN` before explicit setup/rotation, then update the deployment's device ID and restart it before starting the replacement helper. Keep `.env`, `.private-pc-connector`, private logs and `.tools` out of uploaded deployment bundles. No port forwarding of MT5/this worker is required or supported.

Do not enable `PC_CONNECTOR_ALLOW_REAL_READONLY=true` until a genuine investor-password demo test and statement reconciliation pass. This flag only permits real-account **history reads**; it never enables orders. No real-account test has been performed in this delivery.

## Verification and limitations

- Schema backup: verified TLS schema dump saved privately as `.tools/pre-pc-connector-schema.sql`; additive migration `202611010003_pc_read_only_connector` applied to local test PostgreSQL and the configured Supabase project. Existing member records were not edited.
- `.\scripts\pnpm.cmd db:generate`, `build`, `lint`, `typecheck`: passed. Build validates 57 HTML files and 26 active exports.
- `.\scripts\pnpm.cmd test`: 78 passed in 24 files, including public-homepage preservation.
- `.\scripts\pnpm.cmd test:integration`: 87 passed in 16 files, including ciphertext-only delivery, single claim, receipt fencing, ownership, stale results, expired secrets, membership revocation, five-account capacity and device token rotation/revocation. Disposable local database only.
- `.\.tools\pc-connector-venv\Scripts\python.exe -m unittest discover -s services/pc-connector -p test_worker.py -v`: 7 passed. Includes rejection of a shared/unexpected terminal **before login**, identity/trading checks, UTC decimal history, credential expiry/context binding, restart/revocation and path/TLS restrictions. Uses fake MT5; does not log into a broker.
- `.\scripts\pnpm.cmd exec playwright test --config playwright.settings.config.ts`: 12 passed at 1440/834/390, including actual browser encryption verified by test-key decryption, credential clearing, offline states, source/stale labels and retained auth sidebar/password behavior. Synthetic fixtures only.
- `.\scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts`: 2 passed, preserving signup/login/profile/photo/approval/revocation on desktop/phone with isolated accounts.
- `.\scripts\pnpm.cmd exec playwright test --config playwright.clean.config.ts`: 6 passed, covering existing navigation, keyboard/touch controls, dialogs, contrast and reduced motion.
- Native setup, DPAPI loading, hidden start/stop/restart and authenticated heartbeat were verified on the owner's PC. Website reports connector available/online, **broker connected: false**. Temporary owner smoke-check sessions were logged out. No broker credentials were supplied or read from the legacy bot.

[Mobile connection capture](screenshots/account-settings/settings-mobile-pc-connection.png) and [mobile calendar capture](screenshots/account-settings/settings-mobile-pc-calendar.png) use synthetic test data.

Remaining: genuine broker demo validation/statement comparison; real-account reads disabled; scaling beyond five accounts; automatic Windows startup; automatic MT5 cache erasure; direct proof of password type beyond broker permission flags. Native MT5 startup can require owner attention for platform updates/first-run setup. A blocked native call may require stopping the connector. The protected logs contain sanitized status messages, not broker passwords or raw provider diagnostics.

Primary references: [MT5 Python terminal connection](https://www.mql5.com/en/docs/python_metatrader5/mt5initialize_py), [login](https://www.mql5.com/en/docs/python_metatrader5/mt5login_py), [account information](https://www.mql5.com/en/docs/python_metatrader5/mt5accountinfo_py), [deal history](https://www.mql5.com/en/docs/python_metatrader5/mt5historydealsget_py), [account permission limitations](https://www.mql5.com/en/book/automation/account/account_limits_and_restrictions).
