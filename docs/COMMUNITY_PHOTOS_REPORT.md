# Community photos and finishing details

The member Signals and admin Manual Signals navigation links now have matching chart icons. The shared footer displays the Malaysia-local current year and “YENGFX HUB. All rights reserved.” The Community room description now encourages discipline, patience, preparation and learning together.

The separate chart-link input has been replaced with a Telegram-style plus button beside the message field. Choose one JPG, PNG or WebP image up to 5 MiB, review its thumbnail, optionally write a caption and send. The attachment can be removed before sending. Text-only and image-only messages are supported. Failed sends retain the draft. Offline previews disable posting and attachments.

Registered members can read messages and images. Posting still requires independently verified JUSTMARKET IB membership plus a qualifying USD 100 deposit, or the administrator role. This does not change Tools/Educations access.

## Implementation and safeguards

- New CommunityMessage image bytes/hash fields and migrations `202610210003_community_photos` and `202610210004_photo_message_constraints` keep photos private in the database. Hidden message images are deleted while the original hash supports safe retry comparison.
- `/api/community/messages/photo` accepts a bounded JSON body with a base64 image. Existing text-only requests retain their smaller body limit. Authors come from the session, never the request body.
- The installed Sharp decoder checks actual file contents and dimensions (maximum 16 megapixels), rejects unsupported/corrupt files and animation, and re-encodes to WebP with a maximum edge of 2400 pixels. Original filenames and image metadata are not published. Concurrent decoding and request rates are bounded.
- `/api/community/messages/:id/image` authenticates every read and rejects hidden or absent images. Responses have a fixed image MIME type, nosniff and private/no-store cache headers. Photo data is excluded from feed JSON.
- Message retry keys compare the original image hash as well as text/reply fields. Database constraints enforce content and attachment bounds. Existing chart links remain readable in older messages, but there is no longer a separate composer link bar.
- Image DOM nodes are reused during polling to avoid repeatedly downloading unchanged photos. The moderation queue includes an authenticated “Open reported image” link, including for image-only posts outside the latest feed page.

## Verification

Use `scripts\pnpm.cmd` as the pnpm wrapper on this Windows workspace.

- `db:generate` and `db:migrate`: succeeded.
- `build`: 31 offline screens exported; 34 HTML documents and JavaScript validated.
- `lint`, `typecheck`: passed.
- `test`: 29 unit tests passed.
- `exec playwright test tests/e2e/community.spec.ts`: 3 passed across desktop, iPad and mobile, including file chooser, preview removal, photo sending and display.

`scripts\pnpm.cmd test:integration`: **50 passed**, including image-only posts, private retrieval, re-encoding, malformed/oversized image rejection, idempotency, moderation and image-only reports outside the latest feed page.

`scripts\pnpm.cmd test:e2e`: **54 passed** across desktop, iPad and mobile (1.3 minutes). After the moderation-queue improvement, the targeted Community suite was rerun: **3 passed**. A read-only review identified that improvement; it is implemented and covered by tests.

Screenshots: `docs/screenshots/{desktop,ipad,mobile}-community-photos.png`. Pictures and discussion text in test screenshots are synthetic fixtures.

## Limits

One still image per message; there are no albums, arbitrary files, videos, voice messages or private chats. Large/animated images must be exported as a supported still image. Database backups now include stored Community pictures. Removing a message prevents future server retrieval but cannot recall copies already received by a viewer. No live MT5 trading is enabled.
