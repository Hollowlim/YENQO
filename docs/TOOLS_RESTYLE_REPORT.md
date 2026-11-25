# Tools: MT5 Control Center

The Tools page at `/app/mt5` now follows the supplied compact control-center example:

- MT5 Control Center heading and Design preview badge.
- Two-by-two cards for Account Balance, Equity, Floating P/L and Open Positions.
- Three-by-three controls: TP 50, SL 30, Breakeven, Secure 25%, Secure 50%, Secure 75%, Secure 90%, Clear SL/TP and Close All. Each includes an icon; Close All has a red accent.
- Responsive black/charcoal cards, gold accents and compact spacing. Device setup and receipt preview links remain available below the controls.

All nine buttons are natively disabled. The page explicitly states DISCONNECTED and shows unavailable values rather than the reference's account figures. TP 50 and SL 30 are illustrative pip presets, not configured broker commands. Secure percentages describe eligible open volume rather than guaranteed profit. No command handler, queue, broker connection or execution was enabled. Existing verified-member access requirements remain unchanged.

Changes are scoped to `apps/web/pages/member/mt5.html`, shared CSS and relevant tests. No database or API behavior was changed.

## Verification

Commands use the Windows wrapper `scripts\pnpm.cmd`:

- `build`: exported 31 offline screens and validated 34 HTML files plus browser/server JavaScript.
- `lint`: passed with zero warnings.
- `typecheck`: passed.
- `test`: 31 unit tests passed.
- `test:integration`: 50 passed.
- `test:e2e`: 57 passed across desktop, iPad and mobile (1.3 minutes).

Browser tests assert exact control order, all nine disabled states, unavailable account values, responsive overflow checks and normal member access. Screenshots are saved as `docs/screenshots/{desktop,ipad,mobile}-mt5.png`. The first browser attempt found the local database stopped; development services were restarted before rerunning verification.

Live trading, custom preset editing and real account telemetry remain unimplemented.
