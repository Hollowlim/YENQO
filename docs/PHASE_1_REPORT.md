# Phase 1 delivery — 20 October 2026

**Historical report:** the initial Next.js implementation described here has since been migrated to plain HTML, CSS and JavaScript at the user's request. See [the current migration report](PLAIN_WEB_REPORT.md) and [current startup instructions](LOCAL_DEVELOPMENT.md). Original framework source is preserved locally in ignored `.tools/next-backup/`.

The Phase 1 application is implemented and running at **http://127.0.0.1:3000**. It is a local read-only demo foundation, not a live trading service. No deployment or Phase 2 work was performed.

## Completed

- Next.js 16.4.2 App Router workspace in `apps/web`, strict TypeScript, Tailwind 4, Radix/shadcn-style reusable button and pnpm lockfile.
- Figma-based obsidian/gold visual system, desktop sidebar, expandable tablet navigation, mobile bottom tabs, keyboard focus/skip link, semantic headings, labeled forms and reduced-motion support.
- Public landing page with club benefits, educational preview, about copy and FAQ.
- Signup, login, logout and password reset scaffolding. Salted scrypt passwords; random opaque session/reset tokens stored only as hashes; one-day sessions; one-use 30-minute reset links; reset revokes sessions. Local outbox delivery is development-only.
- Independent server-side member and admin route guards. Submitted role/user IDs cannot elevate registration or confer ownership. Admin pages do not expose customer accounts or trading controls.
- PostgreSQL Prisma schema and migration for users, sessions, membership entitlements, reset tokens, rate limits and authentication audit events. Local-only Docker Compose configuration and idempotent demo seed.
- All requested member pages, demo details and admin route shells. Disconnected MT5 account selector/positions, disabled controls, device setup and receipt placeholders. No broker or device endpoints were created.
- Clear demo labeling on illustrative account figures and charts. MT5 values remain unavailable while disconnected. Strategy Lab is unvalidated; backtesting has no verified results or invented statistics. Pricing and checkout remain unavailable.
- Vitest, HTTP/database integration, development reset delivery and Playwright tests. Screenshots saved at all three viewport sizes.

## Exact verification results

Commands were invoked using `scripts\pnpm.cmd` in this Windows workspace, the local equivalent of `pnpm` shown below. Unless noted otherwise, each completed with exit code 0.

| Command | Final outcome |
| --- | --- |
| `pnpm install` | Passed; dependencies installed and lockfile written. Second install applied scoped patched Prisma tooling dependencies. |
| `pnpm db:generate` | Passed; Prisma client 6.19.0 generated. |
| `pnpm exec prisma validate` | Passed; schema valid. |
| `pnpm db:migrate` | Passed; `202610200001_foundation` applied to local PGlite. |
| `pnpm db:seed` | Passed; local member/admin accounts created without printing passwords. |
| `pnpm build` | Passed; optimized Next.js build, type compilation and route generation. |
| `pnpm lint` | Passed with zero warnings under `--max-warnings 0`. |
| `pnpm typecheck` | Passed for application, tests, seed and test configuration. |
| `pnpm test` | **9 passed**, 2 test files. |
| `pnpm test:integration` | **12 passed**, 1 test file, real HTTP against the local application and PGlite. |
| `pnpm test:reset` | **1 passed**, local development outbox → reset → login; test message removed afterward. |
| `pnpm test:e2e` | **21 passed** in the final run, 19.8 seconds. |
| `pnpm audit --prod` | Passed: no known vulnerabilities found at verification time. |
| Portable Node running `.tools/check-client-secrets.mjs` | Passed: none of the local demo passwords or DATABASE_URL appeared in 17 static client output files. |

Browser tests use Chromium at **1440×1000**, **834×1112**, and **390×844**. They cover 19 member routes, six admin routes, all auth screens, invalid dynamic IDs and unknown routes. Assertions include no page-level horizontal overflow, member/admin isolation, disabled trading controls, working demo filters, navigation/sign-out, and signup/login/reset/session revocation. Member screen traversal recorded no browser page errors. The MT5 table scrolls inside its own container on narrow screens.

Security coverage includes salted passwords, invalid token formats, session expiry boundaries, admin versus ownership distinction, forged registration roles, wrong passwords, hashed sessions, same-origin enforcement, reset replay/expiry, logout revocation, rate limiting, oversized streaming bodies, and absent broker endpoints. These are foundation tests; future real account isolation and broker lifecycle tests remain necessary when those systems exist.

## Errors found and resolved

- Installed checksum-verified portable Node and local pnpm because the initial machine had no working Node/pnpm installation.
- Downloaded Prisma query engine and Playwright Chromium after sandboxed network attempts failed; automatic review approved the necessary downloads. No approval rejection remains outstanding.
- Corrected monorepo ESLint configuration and anonymous default-export warnings.
- Added PGlite multiplexer connection settings after prepared-statement collisions. A later multi-server verification run exhausted local fallback connection handlers; restarting the database and one app server restored the tests. Run one app server at a time with this fallback.
- Corrected UTC handling in rate-limit SQL after a non-UTC database comparison reset a test budget prematurely.
- Review found anonymous global limits could block legitimate logout and request bodies were buffered before bounds checking. Logout now uses its authenticated user budget; streamed bodies are cancelled after 8 KiB. Regression tests pass; follow-up review found no remaining substantive issues in those fixes.
- Browser signup/reset checks exposed a password hint included in the field's accessible name. The hint now uses `aria-describedby` independently of the label; the full form flow passes.
- Production dependency audit initially reported two high-severity Prisma tooling dependencies. Scoped overrides installed patched Effect and DeepmergeTS releases; Prisma generation/validation/build and all final checks passed afterward. Advisory references: [Effect](https://github.com/advisories/GHSA-38f7-945m-qr2g) and [DeepmergeTS](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).

Initial failing runs were corrected; there are no remaining failures in the final commands listed above. Nonblocking installation notices remain: ESLint 9 is deprecated upstream, an optional unrs-resolver build script was not enabled, and Playwright reported a host NO_COLOR/FORCE_COLOR warning. The strict lint command still passed.

## Visual review

- [Desktop overview](screenshots/desktop-overview.png)
- [iPad overview](screenshots/ipad-overview.png)
- [Mobile overview](screenshots/mobile-overview.png)
- [Desktop landing](screenshots/desktop-landing.png)
- [Mobile landing](screenshots/mobile-landing.png)
- [Mobile MT5](screenshots/mobile-mt5.png)

The screenshot directory also contains Strategy Lab, backtesting and admin shells at each size. Figma was used as a visual specification, not runnable source or a screenshot asset. Premium overview, strategy, backtesting, MT5, tablet/mobile overview and landing references were retrieved with high-fidelity context and screenshots, along with auth, signals, mapping, academy, journal, membership, settings and some admin views. Figma then reached its Starter-plan call limit. Remaining admin layouts follow the supplied requirements and established design tokens; screenshots are needed for exact visual matching of unretrieved frames. The implementation adds conspicuous safety labels, responsive wrapping and working navigation where the reference was only a prototype. Typography uses system Arial/Helvetica fallback; it does not download Inter or fabricate an official logo.

## Remaining scope and limits

- **Docker is unavailable.** Compose is provided, but PostgreSQL container startup and real PostgreSQL concurrency were not tested. PGlite is only a local development fallback. Re-run the same migration/auth suites against PostgreSQL before deployment.
- **No live MT5 trading, pairing, telemetry or broker operations.** All trading buttons are disabled. No command preview/queue/lease/retry/ACK lifecycle is implemented in Phase 1. Existing Python/MQ5 source was not supplied or modified.
- CMS publishing/revisions, journal persistence, academy progress, notification delivery, profile changes, member administration, paid entitlement enforcement, payments, Telegram, indicator execution and verified backtests remain unimplemented.
- Production reset email delivery, email verification, MFA, nonce-based CSP, trusted-ingress resource/per-client limits and deployment operations remain future work. Local password-reset scaffolding and role/session enforcement are tested; this is not a claim of production readiness.
- Tablet/mobile checks emulate Chromium viewports/touch. Native Safari, physical device testing and a complete WCAG audit were not performed.
- Git is unavailable and the starter directory was not an existing Git checkout. No commits, branch, pull request or deployment were created.

Demo account access, safe local configuration and restart instructions are in [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md). Passwords remain only in the ignored local `.env`.
