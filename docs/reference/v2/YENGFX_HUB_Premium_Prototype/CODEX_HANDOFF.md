# Codex Upgrade Brief — YENGFX HUB V2 Premium

## Context
The owner has an existing V1 Codex implementation. **DO NOT discard the existing codebase or data.** First audit routes/components/auth/database, compare to `/index.html` and Figma, then stage a V2 branch. Reuse working infrastructure.

Figma: https://www.figma.com/design/iJ3pndGzZkvJc2rlUcTyy5
Visual prototype: this folder's `index.html`, `styles.css`, `app.js`, and transparent YENGFX logo asset.

## Copy/paste into Codex

> Inspect my existing YENGFX HUB repository before making changes. Design a PREMIUM V2 frontend that adopts the attached YENGFX HUB V2 prototype's dark/obsidian, metallic-gold, minimal fintech design, crisp hierarchy, responsive layouts, and compact mobile-first trade terminal inspired by the screenshot. Preserve my existing routes, users, database, authentication and working features. Build/rework these member modules: Dashboard; MT5 Trade Manager; Live Signals; Academy; Community Feed; Live Chat; Strategy Lab (future); Admin Studio; Settings. Make desktop, iPad and mobile layout responsive. Extract reusable cards, navigation, trade-action tiles, hold-to-confirm control, modals, notification components and gold design tokens. Implement clean working client-side demo navigation and state first. IMPORTANT: Existing live MT5/Telegram integration must remain OFF during redesign. Use demo data prominently marked; no fabricated indicator results. Real trade commands require server-side ownership enforcement, confirmation, one-time command IDs, auditable broker acknowledgement, account/symbol validation and a per-user EA connection. Real chat requires authenticated chat server, moderation, roles, storage, rate limiting, abuse/report controls and WebSocket or managed realtime service. Add accessibility, keyboard support, mobile touch targets, loading/error/offline states and end-to-end tests. Deliver a V2 preview before connecting MT5 or live users. Do not copy friend's logo or UI verbatim.

## Functional screens
| Screen | Client interaction | Backend later |
|--|--|--|
| Overview | Member account overview, recent lessons/signals, connection badge | Auth, telemetry and CMS |
| Trade Manager | BE, BE+2, secure 25/50/75/90, De-risk, Trim, Cut -5, Cancel pending, TP/SL Price/Pips, Close All | Per-account device bridge, command lifecycle, broker confirmations |
| Signals | Entries, stops/targets when verified, timeframe, rationale, status, revisions | Admin signal CMS and alerts |
| Academy | Courses, progress, lesson videos, mentorship | Content management and entitlements |
| Community | Post/comment/react/report, topic channels | Realtime feed, DB, moderation |
| Live Chat | Mentor support, community room, tech support, unread, attachments | Authenticated realtime messaging and message retention |
| Strategy Lab | Strategy spec, nonrepaint test, walkforward/oos research | Formal indicator definitions, historical market feed |
| Admin Studio | Manage content/members/moderation/chats | Server roles, audit logs, subscriptions |

## Important trade rules
- 'Secure X%' = percentage of **open trade volume**, not P/L. The legacy YENGFX preference is BUY highest-entry-first and SELL lowest-entry-first, subject to actual broker min lot steps and permissible closings.
- Partial closing can close losing positions; do not call it "profit secured" without checking realized P/L. Present projected tickets and slippage/cost risk for confirmation.
- No duplicate Close All on reconnect. Device offline must disable or expire potentially destructive commands.
- Require proof of cross-account isolation and demo MT5 testing before production financial execution.

## Acceptance tests
- At widths 390px, 834px, 1440px, every screen is usable with no unintended horizontal overflow.
- Mobile nav and menu work, all demo actions confirm, Close All requires hold and confirmation.
- Community posts and simulated chat persist locally for demo, with an explicit not-live label.
- Switching to real data must replace mocked values, not merely remove DEMO labels.
- Log out, auth expiration, access restrictions, notifications and moderation specified and tested separately before release.
