# Admin page connection check

1 November 2026. The reported admin loading failure was a stopped local web server: `/`, `/auth/login` and `/admin` all returned `ECONNREFUSED`, with no listener on port 3000. It was not an invalid-credentials response.

Restarted the configured app as a hidden background Node process with its existing Supabase network access. Left it running for the owner's manual client/admin testing. Added `START_YENGFX_TEST.cmd` so the owner can start the existing `scripts\pnpm.cmd dev` command in their own terminal and keep it running independently of this coding session.

Ran `node .tools/check-admin-page.mjs` using bundled Node. It reads the existing admin configuration privately, signs in against the local app, checks the protected admin HTML and operations API, and signs out only its newly created check session. Actual outcomes:

- Admin login: HTTP 200.
- Protected `/admin`: HTTP 200.
- `/api/admin/dashboard`: HTTP 200.

No password was changed, no authorization was bypassed, and no other user's session was logged out. No client data or credentials were printed. Normal sign-in auditing/last-login state is retained by the existing authentication service. This is a local availability fix, not a hosted deployment or an authentication redesign.
