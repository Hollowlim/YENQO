# Product requirements and route map

## Visual
Obsidian #08090C, cards #13151B, warm metallic gold #E8BE68, neutral white #F8F6F0, subtle stroke. Polished premium fintech visual hierarchy, tasteful shadows, accessible contrast, responsive typography, chart placeholders clearly labeled demo. No giant decorative gradients masking the content. Desktop sidebar; tablet collapsible sidebar; mobile bottom/tab navigation. Use actual user logo asset only once supplied; don't fabricate official logo.

## Routes
/ — marketing, club benefits, signals preview, CTA
/auth/login, /auth/register, /auth/forgot-password
/app — member overview: account status, positions snapshot (when connected), latest signal, market mapping, Strategy Lab status
/app/mt5 — account selector, position list, risk overview, controls, connection freshness
/app/mt5/devices — device pairing/revoke, step-by-step installation
/app/mt5/commands/[id] — submitted/pending/executed/failed receipts
/app/signals, /app/signals/[id]
/app/mapping — bias and annotated chart media, scenario/invalidation and revision log
/app/strategy — indicator research drafts/rules/version status
/app/backtesting — datasets, test configurations, imported verified results, cost assumptions, train/test split
/app/academy, /app/academy/[lessonId]
/app/journal — journal entries and filters; account-scoped private data
/app/membership — plan and entitlement information; no live payment provider until chosen
/app/notifications, /app/settings
/admin — operational dashboard, no automatic customer trade authority
/admin/signals, /admin/mapping, /admin/content, /admin/members, /admin/audit

## Roles
Guest, Member, Admin; plans as entitlements rather than hard-coded roles. One member can link multiple EA devices/accounts, selected account must be explicit. Personal device ownership cannot be overridden by client-provided IDs.

## Trading action UI
Status/Positions/Lots/Daily/DD/Risk/Layers/Avg are informational.
TP/SL with custom pips and exact-price modes, BE, clear SL/TP, volume-based secure 25/50/75/90%, Close All with strong confirmation. Modal must show target device, broker server, account number (masked if needed), symbol/tickets, projected volume, min lot impact, preview TTL, and explicit opt-in. Show pending/acknowledged/partially filled/failed/timed-out statuses and exact broker execution receipt.
Do NOT create active broker trade endpoints in initial prototype.

## Indicator and backtest workflow
Indicator rules TBD. Research drafts can document SNR, SBR/RBS, trendline, BOS/CHOCH, Fibonacci; no auto-generated buy/sell signals without explicit formalized rules. No lookahead/repainting. Backtest report requires dataset source, feed timezone, spread/commission/slippage, symbol spec, sample dates, test method, and version hash; initially show 'No verified backtest'. Visual overview should not show fabricated indicator success metrics.

## Admin CMS
Signal drafting, scheduling, publishing, revisions, invalidation, educational disclosures. Mapping date/asset/timeframe/bias, screenshots/chart links, notes, scenarios, edit history. Membership oversight, audit logs, connection health. Customer position details not viewable by default.

## Membership
Tier prices, billing vendor and regulatory policy TBD; implement editable placeholders and access-control model, not fake checkout.
