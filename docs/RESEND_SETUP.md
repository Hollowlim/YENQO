# Resend: password resets and IB membership review emails

Implementation is prepared. Live sending has not been activated or tested with the owner's domain/key. No Resend account, paid plan, payment, domain or DNS record was created in this task. The P/L connection was subsequently switched to [MetaApi](READ_ONLY_BROKER_SETUP.md); its token and genuine demo test are pending, and the PC connector is disabled. No MetaApi account has been provisioned.

## Owner setup

1. Create/sign in to [Resend](https://resend.com), open **Domains → Add domain**, and enter a domain you own (a subdomain such as `mail.yourdomain.com` also works). Add the exact DNS verification records Resend supplies at your domain's DNS provider. Wait for **Verified**. You cannot use a personal `gmail.com` address as an owned sending domain.
2. Create an API key with **sending access**, scoped to the verified domain where available. Save it privately in the server's `.env` or deployment secret settings. Never send it in chat, put it in HTML, or commit it.
3. Configure these server-only values using your actual verified domain:

```dotenv
RESEND_API_KEY=replace_privately
RESEND_FROM=YENGFX HUB <account@mail.yourdomain.com>
MEMBERSHIP_EMAIL_ENABLED=true
DEV_EMAIL_OUTBOX=false
APP_ORIGIN=https://your-actual-webapp-domain.com
```

`RESET_EMAIL_FROM` remains a fallback for earlier installations; `RESEND_FROM` takes precedence for both email types. Production requires a root HTTPS origin. During local development only, `APP_ORIGIN=http://127.0.0.1:3000` is supported, but those links open only on the same PC. Do not send clients localhost reset links. Restart the web server after changing environment values. Keep open/click tracking disabled for password-reset emails in Resend.

4. Request a reset for your own test member using **Forgot password**. Confirm the message is accepted in Resend and arrives in your inbox, then test that the link works once and expires after 30 minutes. Confirm the old password and old sessions stop working after reset. The public request response never reveals whether an email address has an account.
5. With a separate test member, verify the broker records first, then approve in Admin. Confirm the member receives the approval email. Revoke with a reason and confirm the access-change email. Rejected pending requests also receive a notice. The review reason is read in the signed-in portal; account numbers, deposit evidence, broker passwords and API keys are not included in the emails.

This implements membership-review notifications, **not signup email-address verification** or automatic IB/deposit verification. The admin's independent review remains required.

## Delivery behavior and limits

- Password resets retain hashed, single-use, 30-minute tokens, rate limits, session revocation and generic public responses. Resend receives the reset link as the email provider. Tokens are not included in provider idempotency keys or audit details.
- Membership email jobs are queued only after a successful review transaction commits. The recipient comes from that review's server-side member record, never client-submitted email/user IDs. Conflicting, denied or rolled-back reviews do not queue notices.
- Before sending, the worker checks the current member/revision and skips superseded notices. Each committed review has a stable Resend idempotency key. Provider acceptance is audited as `MEMBERSHIP_EMAIL_ACCEPTED`; this means accepted for sending, not confirmed inbox delivery. There is no delivery/bounce webhook in this version.
- Errors are sanitized and audited as `MEMBERSHIP_EMAIL_FAILED`. Unconfigured/busy notifications are shown honestly in the admin save message; email transport never reverses the committed membership decision. Accepted-event audit checks prevent routine re-enqueueing. Resend's idempotency window is 24 hours.
- Both reset and membership queues are bounded, best-effort in-process workers. Pending jobs may be lost on process restart. There is no durable outbox, automatic retry/recovery or admin email retry button yet. For an initial owner-operated beta, monitor Resend/Audit and use the portal as the source of current access. A durable delivery worker is a remaining production reliability improvement.
- `DEV_EMAIL_OUTBOX=true` writes local test messages under gitignored `.local-mail` only outside production; it never means inbox delivery. Do not enable it for actual clients.

Free-tier quotas and paid rates can change; review [Resend pricing](https://resend.com/pricing) in your account before enabling. Password resets and membership notices share the transactional quota.

## Verification

Run `scripts\pnpm.cmd test`, `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck`, and `scripts\pnpm.cmd build`. Unit tests use mocked Resend responses, including membership state changes, replay suppression, provider errors, unsafe origins, disabled sending and bounded queues. Relevant auth/membership integration tests use an isolated local PostgreSQL database. No real email was sent during implementation. The public homepage, navigation change from the preceding task, backend access checks and PC connector are preserved by the existing byte-hash checks, with only the explicitly authorized membership route source recorded in `RESEND_REVIEW_BASELINE.json`.

Delivery checks passed: `scripts\pnpm.cmd test` (84 tests), `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck`, `scripts\pnpm.cmd build` (57 HTML files / 26 active exports), and `scripts\pnpm.cmd exec vitest run --config vitest.integration.config.ts tests/integration/auth.test.ts tests/integration/membership.test.ts tests/integration/admin-direct-membership.test.ts tests/integration/membership-email.test.ts` (26 tests). The integration suite verifies actual review transactions with a mocked external provider; the owner database is not used for test mutations.

References: [sending API](https://resend.com/docs/api-reference/emails/send-email), [domain verification](https://resend.com/docs/dashboard/domains/introduction), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
