# YENGFX HUB — Premium Client WebApp Prototype V2

## What this is
A standalone responsive **interactive front-end demo** inspired by the uploaded reference and customized for YENGFX. Its entire purpose is UI/UX approval before integrating with the existing Codex project, MT5 and the live backend.

**No brokerage connection, no real orders, no actual live chat, no real signal data.** All data is clearly labeled demo. The browser stores example posts/lessons/chats/trade simulation results in `localStorage` on the current device.

## Preview
Open `index.html` in any modern browser, or serve locally:

```bash
python -m http.server 8088
```

Then visit http://localhost:8088.

## UI functionality in this demo
- Premium responsive PC, iPad and mobile navigation
- Overview with sample stats and illustrative chart
- Trade manager with Breakeven, BE +2, Close 25/50/75/90% volume, De-risk, Trim 2, Cut -5, Cancel pending orders, TP/SL input toggle, Hold for 1 second to Close All, confirmation dialogs and demo audit list
- Signals mock feed and analysis details
- Education modules with demo completion progress
- Community posts and likes in local browser storage
- Live chat with simulated rooms and personal messages (not connected to others)
- Strategy Lab / Backtesting placeholder, not fabricated results
- Admin Studio design preview
- Settings, demo reset, proposed MT5 pairing guide

## Upgrade the existing Codex project rather than overwrite it
Copy the design look and interaction ideas into the existing YENGFX Next.js codebase. The web app's backend should use authenticated per-member MT5 account access, server-side ownership checks, audited and idempotent commands, read-only phase before trading phase, and a separate message delivery service for live chat. **Never ship this standalone HTML as a real trading product.**

See `CODEX_HANDOFF.md` for the copy/paste prompt and functionality checklist.
