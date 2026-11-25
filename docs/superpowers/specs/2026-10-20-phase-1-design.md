# Phase 1 foundation

Build only the foundation specified in prompts/01-foundation.txt. The user's “jus do it” directs continuous implementation of the supplied requirements without further design approval gates.

## Architecture and security

Next.js App Router in apps/web, strict TypeScript, Tailwind and a Radix-based shadcn-style button. PostgreSQL with Prisma stores users, opaque hashed sessions, reset tokens, rate limits and audits. Passwords use Node scrypt. Session cookies are HttpOnly, SameSite=Lax and Secure in production. Every private page resolves its principal on the server; admin pages additionally require the database-backed ADMIN role. Registration always creates MEMBER. Writes require same-origin checks and database rate limits. No route accepts userId as authorization. All application content in this phase is static labeled demo material; no customer account data is exposed.

Auth supports signup, login, logout and one-use expiring password reset scaffolding. Reset delivery uses a local server-only file outbox explicitly enabled in development; production delivery remains disabled pending an email provider. Database setup failures produce a useful unavailable message and never bypass authentication.

## UI and scope

Use Figma premium overview 9:2, strategy 9:80, backtesting 9:118, MT5 9:160, tablet 9:212 and mobile 9:235 as references. Obsidian #08090C, cards #13151B, gold #E8BE68, white #F8F6F0. Desktop sidebar, tablet expandable navigation, mobile bottom tabs with an accessible full-menu disclosure. All PRODUCT_REQUIREMENTS routes render, including dynamic demo detail routes. Public home includes benefits, educational preview, FAQ, and auth CTAs. Demo financial figures, where shown, explicitly say illustrative; disconnected account values use dashes. No official logo is fabricated.

MT5 is disconnected with disabled controls. Pairing, command receipts, content CMS, subscriptions, journal persistence, research execution, backtests, real payments and Telegram integration are not implemented. No broker endpoint, queue, device credential or execution flag is introduced. Future command lifecycle remains governed by SECURITY_AND_EA.md.

## Verification

Vitest covers passwords, tokens, session expiry, role checks, validation and CSRF. PostgreSQL integration and Playwright cover auth flows, reset/replay, rate limits and role isolation. Browser smoke checks enumerate every route at 1440, 834 and 390 widths, check overflow and disabled trade controls. Run install, Prisma validation, lint, typecheck, tests, build and browser checks. Record unavailable services honestly.
