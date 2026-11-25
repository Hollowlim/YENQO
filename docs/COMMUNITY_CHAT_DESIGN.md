# Community discussion: proposed first version

## Purpose

Let clients share their own analysis/mapping, discuss ideas and receive replies from the owner within YENGFX HUB. This is a new subsystem, separate from automated signals or MT5 execution.

## Decisions awaiting owner input

Confirmed: all registered members can read. Only verified IB + qualifying USD100 members and admins can post/reply. Shared room first, no private messages. Text and HTTPS chart links are the first release; native uploads are not part of it.

Use the same server-side verified membership evidence as Tools/Educations for posting, while permitting authenticated room reads independently.

## Recommended first release: one shared room

Add Community to member navigation. Show a chronological conversation with pagination, timestamps in Kuala Lumpur time, public display names and server-derived admin badges. Allow plain-text posts and replies, with optional HTTPS chart links. Do not expose email addresses, IB evidence, account identifiers or online-presence claims. Render user content as text; do not interpret HTML or auto-embed arbitrary URLs/images. Clearly indicate that room posts are visible to other authorized community members.

Include a composer with a character limit, keyboard-accessible send action, visible delivery/error state and a client-generated idempotency key. Poll only while the authenticated room is visible, with backoff; do not claim WebSocket realtime or reliable push notifications. Preserve pagination/scroll position and drafts during transient errors. Sending by Enter should not interfere with multiline composition.

Members can remove their own posts; admins can hide room posts with an audit reason. Hide removed content in subsequent responses and replies rather than leaking originals through a detail endpoint. Add a member report action and a rate-limited admin review queue before opening the room broadly. No automated trade instructions or broker operations are part of chat moderation.

## Security and persistence

Use database-backed messages, replies and reports. Every room read/send/remove/report must authenticate on the server and enforce the selected community access policy. Derive sender IDs and roles from the session. Removal must scope to the sender unless the operation is an explicitly audited admin moderation action. Limit body size, validate content length, protect mutations with same-origin checks, rate-limit posting and polling, use a unique author/idempotency-key constraint and paginate with stable cursors. Do not return sessions, password hashes or private membership metadata.

Keep operational audit entries separate from public messages and avoid duplicating message bodies into general-purpose logs. Define a retention policy before production rollout.

## Additional scope

Private messaging requires conversation participant authorization on every message lookup, so another member can never guess an ID and read a private thread. Administrators may read only their own designated inbox conversations, not arbitrary member-to-member conversations. The UI must explicitly distinguish private inbox threads from the shared room.

Native screenshot uploads require authenticated file handling, decoded image validation, file-size limits, metadata stripping, safe storage/serving and retention rules. Start with HTTPS chart links unless uploads are explicitly included. Neither attachments nor Telegram delivery should be represented as implemented by a text-chat prototype.

## Acceptance

Test unauthenticated denial, free/verified access according to the selected policy, sender forgery, XSS-as-text, CSRF, post limits, duplicate sends, stable pagination, own-post deletion, denied cross-user deletion and audited admin hiding. If DMs are included, test cross-conversation reads and writes with multiple users. Browser-check composing, replying, retry/error states, moderation and responsive layout at desktop, iPad and mobile widths. Use synthetic test messages only and remove them after tests.

## Status

Implemented and verified. See COMMUNITY_REPORT.md for exact commands, results and limitations. Plan: docs/superpowers/plans/2026-10-20-community.md.
