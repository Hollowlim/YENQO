# Profile picture and sidebar toggle update

Client and admin Settings now let the owner click or keyboard-activate the profile picture to select a new image. The separate visible file-upload panel is removed. The native picker is hidden behind a labeled button with a camera badge. Selecting an image opens an inline preview with Save/Cancel; saved photos can still be removed. The existing authenticated own-photo API, server-side image validation/cropping, 5 MB limit, error handling and header/sidebar avatar updates remain in use. Offline preview cannot upload.

The owner clarified that only the sidebar open/close icon should change. The sidebar layout, destinations, permissions and responsive navigation behavior are preserved. Both supplied icon references appeared black/unreadable, so the implementation uses a clean panel icon with arrows indicating open/closed state. Desktop toggles announce Show/Hide sidebar; mobile retains Open/Close navigation and Escape/focus behavior. Touch targets are at least 44 pixels.

Changes are confined to `profile-card.html`, `profile-photo.js`, Account Settings CSS, the private `portal-layout.html`, `portal-clean.css` and `portal-v6.js`, generated private HTML and tests. The older shared `v2.js` file retains its original bytes. Public homepage files, authentication source, broker sync, Resend configuration and private data permissions were not changed. The historical preservation manifests remain intact; `AVATAR_SIDEBAR_BASELINE.json` records 46 explicitly authorized private UI/template/asset/render/export entries.

Validation:

- `scripts\pnpm.cmd build`: passed, 58 HTML files validated / 26 active exports.
- `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck`: passed.
- `scripts\pnpm.cmd test`: 85 passed in 25 files.
- `scripts\pnpm.cmd exec playwright test --config playwright.settings.config.ts`: 21 passed at 1440, 834 and 390 pixels. Covers the avatar file chooser, keyboard activation, preview/cancel, upload/removal, header photo updates, overflow and sidebar state. An initial tablet chooser timing failure was resolved by activating the focused button through its locator; the completed suite passed.
- `scripts\pnpm.cmd exec playwright test --config playwright.v6-auth.config.ts`: 2 passed, exercising actual client/admin photo persistence with isolated local accounts along with signup/login, profile edits and membership approval/revocation.
- `scripts\pnpm.cmd exec playwright test --config playwright.clean.config.ts`: 6 passed, covering navigation, keyboard/touch, dialogs, accessible contrast and reduced motion.

All database mutations used disposable local test accounts. No existing customer's profile image was replaced. [Mobile member capture](screenshots/account-settings/settings-mobile-avatar-member.png), [mobile admin capture](screenshots/account-settings/settings-mobile-avatar-admin.png), and [desktop member capture](screenshots/account-settings/settings-desktop-avatar-member.png) use synthetic pictures and account details.
