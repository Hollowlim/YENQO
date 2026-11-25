# Beta 1

Tools is now a Coming Soon screen for members, administrators and offline previews. No trading simulator or command buttons are mounted. The homepage also describes Tools as coming soon. Existing membership permissions remain unchanged; this does not grant free users access to other protected features.

For beta testing use the running Node website and real registration/login, not file previews. Existing implemented content, education, Community and membership-review flows remain available. This change does not publish or deploy the site. Email-provider setup, persistent uploads/backups, HTTPS hosting and the limitations in `YENGHUB_WEBGL_REPORT.md` / `WEBSITE_AUDIT_2026-10-23.md` still apply. Live support/broadcasting and MT5 cloud connectivity remain unimplemented. Live trading is disabled.

Verified this change with build, lint, typecheck, unit tests, and a Chromium file-preview smoke at 1440×1000, 834×1112 and 390×844: Coming Soon visible, no simulator mounted, no horizontal overflow, Community link works. Historical Tools browser assertions were updated to reflect Beta 1; the full backend/browser audit was not rerun in this change.
