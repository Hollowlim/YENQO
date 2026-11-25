# Video Educations

## Use it

1. Sign in as administrator at http://127.0.0.1:3000.
2. Open **Educations CMS** (`/admin/content`). Enter a lesson title and description, then **Save draft**.
3. Choose an MP4 video (maximum 500 MiB / 524,288,000 bytes) and click **Upload video**. Upload progress and validation results appear below the editor.
4. Preview the uploaded video, then **Publish**. Verified JUSTMARKET IB members with a qualifying USD 100 deposit can watch at `/app/academy`.
5. Use **Edit lesson** to change text, **Save draft** to withdraw it, or **Archive** to hide it. To replace a video, save the lesson as a draft before uploading the replacement.

Use H.264 video and AAC audio for broad browser compatibility. MP4 container validation does not transcode codecs. Videos remain private drafts until explicitly published. All registered members can still view Mapping and Signals; Educations retains its verified-membership restriction.

Member navigation now places **Signals above Community**, including the mobile bar. Administration places **Manual Signals above Mapping CMS** and labels the video editor **Educations CMS**.

## Implementation

- `VideoLesson` database model and migration `202610210002_video_lessons` store metadata, versions, publication state and generated storage names. Database constraints enforce valid text, video size and publication prerequisites.
- `/api/admin/lessons` handles drafting, edits, publication and archiving. `/api/admin/lessons/:id/video` accepts streamed MP4 uploads and serves administrator previews.
- `/api/content/lessons` returns published lessons to eligible members. `/api/content/lessons/:id/video` rechecks session, membership and publication status before every request.
- Videos are stored in gitignored `.private-videos/` outside public assets, under random filenames. They are streamed with bounded buffers and HTTP byte ranges for seeking. No public storage URL is provided.
- Uploads require same-origin requests, administrator sessions, draft status and a matching lesson version. The server checks declared and actual byte limits and MP4 box structure, limits active uploads, cleans up failed uploads and replaces old files after a successful commit. Upload and metadata operations produce audit records.
- Video players use native browser controls; metadata is rendered as text. Offline HTML previews disable uploads and make no private content requests.

## Verification

The portable Windows wrapper `scripts\pnpm.cmd` runs the following checks:

- `db:generate` and `db:migrate`: succeeded; migration applied.
- `exec prisma validate`: valid schema.
- `build`: 31 offline screens exported, 34 HTML files and browser/server JavaScript checked.
- `lint` and `typecheck`: passed.
- `test`: 28 unit tests passed.
- `test:integration`: 45 tests passed, covering private drafts, membership and role boundaries, CSRF, malformed MP4s, declared size limits, upload/publication, byte ranges, direct URL protection, stale revisions, revocation and archival.
- `exec playwright test tests/e2e/education.spec.ts`: 3 passed across desktop, iPad and mobile, including playback of a real synthetic MP4 and both menu orders.

`scripts\pnpm.cmd test:e2e`: **54 passed** across desktop, iPad and mobile (1.2 minutes). The initial run found outdated heading assertions in the membership test; these were updated from the old Academy heading to Educations before the successful full rerun.

The fixture `tests/fixtures/lesson.mp4` was generated using a browser canvas and MediaRecorder. It contains a synthetic test title, no real education content or market data. Screenshots: `docs/screenshots/{desktop,ipad,mobile}-video-educations.png` and `*-education-editor.png`. A read-only code review found no substantive actionable issues.

## Limits and deployment

This version uses private local disk, not hosted object storage/CDN. Back up `.private-videos/` together with the database and preserve it across deployment; a multi-server deployment needs shared storage. Interrupted uploads are cleaned up during normal request handling, but a process crash can leave an unreferenced file requiring maintenance. There is no resumable upload, automatic transcoding, captions editor, scheduling, hard deletion UI or lesson-progress tracking. Files already received by an authorized viewer cannot be recalled; new requests recheck authorization. Production PostgreSQL deployment remains to be verified separately from local PGlite.

No live MT5 trading was enabled.
