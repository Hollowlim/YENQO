# Live Trade rooms and Free Community

Status: proposed design for review; not implemented.

## Confirmed requirements

- All authenticated registered members, including FREE members, can post, reply and share supported images in regular Community.
- Live Trade rooms are separate and require approved JUSTMARKET IB `jai4w0w6` plus an independently verified qualifying deposit of at least USD 100. Administrators may enter as hosts.
- An authenticated database ADMIN can create a room, share a screen/window, broadcast microphone audio, chat, moderate and end the room. The existing YENGFX admin login is used; a submitted username is never authority.
- Verified members can watch, listen and use room text chat. They cannot publish screen, camera or microphone tracks, create rooms or end rooms.
- Live Trade means an educational broadcast. No MT5 orders, remote account control, trade execution, recordings or automated signals are added.
- Retain plain HTML/CSS/JavaScript and the current black-and-gold responsive design.

## Streaming approach

Recommended: LiveKit Cloud for WebRTC media, with its JavaScript browser SDK and server SDK. The Node application remains responsible for sessions, membership, room lifecycle, chat and audits. Cloud participant token revocation is needed to block cached-token reconnects after removal. No provider account, paid plan or cloud resource is created by this design.

Alternatives considered:

1. Self-hosted LiveKit: more control, but requires a public media server, TURN/network configuration and operations; token revocation behavior differs from Cloud.
2. Peer-to-peer broadcasting: avoids an SFU initially but increases admin upload bandwidth per viewer and is a poor default for a client community.
3. Embedded external meeting: faster setup but weakens the website's membership enforcement and integrated chat experience.

Actual broadcasting requires a configured streaming service. Until configured, the UI says streaming is unavailable and does not claim a live connection. Provider fees/limits must be checked against the owner's chosen plan before public launch.

## User experience

### Regular Community

Keep the existing Telegram-style room and attachment controls. Remove the premium requirement for posting/replying/images. Keep authentication, rate limits, image decoding/limits, reporting, author-only deletion and admin moderation. Update membership benefit copy so Community posting is no longer advertised as exclusive to Verified IB members. Revoked members retain regular Community access.

### Admin Live Trade

Add Live Trade to admin navigation. A room form has a title and optional description. First version supports one active broadcast per host. A room opens in READY state; creating a room never starts capture automatically.

The host explicitly selects Share screen, sees the browser's source picker, and separately enables the microphone. Show local preview, microphone mute/unmute, screen-sharing state, reconnecting/error feedback, viewer count based on actual connections and End room. A LIVE badge requires confirmed host screen publication; room creation or a local preview alone is not live.

Stopping screen sharing returns the room to a waiting state with chat still available. Ending the room stops all captured tracks, disconnects media, disables chat writes and shows Ended. Close/refresh must clean up local tracks. A lost host connection shows disconnected/waiting rather than a frozen live claim.

### Member Live Trade

Add Live Trade to member navigation. Free members see an upgrade explanation and can request verification; they cannot fetch private room metadata, messages or join credentials. Eligible members see available rooms and can enter.

Room layout: large shared-screen player, host/title/status, fullscreen control, Leave button and separate room chat. Desktop uses video plus side chat; mobile stacks video and chat. Provide an explicit Play audio control when autoplay is blocked. Members are never asked for camera/microphone/screen capture permission.

The host can choose an entire screen using browser-supported source selection; the website cannot bypass the browser picker or guarantee whole-screen capture on every browser. Initial hosting targets desktop browsers. Phone/iPad clients may watch and chat; host capture capability is checked at runtime.

## Data and access

Add private database models for LiveRoom, LiveRoomMessage and participation records. Rooms record host principal, title, description, opaque provider room identifier, READY/ENDED lifecycle, version, timestamps and media reconciliation status. Messages record room, authenticated author, text, client idempotency key, creation/removal timestamps. Room IDs and provider identities contain no email, MT5 number or broker credentials.

All HTTP reads and writes authenticate the session. Each Live Trade request checks current full membership or ADMIN role. Host mutations additionally require room.hostId to equal the authenticated admin principal; moderation is explicitly admin-scoped. Database transactions/version checks protect duplicate creation/end requests. Message uniqueness covers room + author + client key; pagination and text sizes are bounded.

Member join credentials are room-scoped, short-lived, subscribe-only and cannot publish media or provider data messages. Host grants allow only screen sharing and microphone sources, not broad room administration. Provider API secret stays on the server. Room chat is stored and moderated through the existing server, not trusted client-to-client messages.

State-changing endpoints enforce origin/CSRF rules and per-user rate limits. No provider tokens appear in URLs, public HTML exports, audit details or logs. Public asset serving remains an explicit allowlist. Extend CSP/connect-src narrowly for the configured provider and media sources; use HTTPS for public screen capture and microphone permissions.

## Revocation and room shutdown

Every join/chat request checks membership again. Membership revocation and account-profile invalidation must also enqueue provider removal for active participants, with an explicit revocation cutoff and retries. Persist removal work so a process restart does not lose it. Logout/session expiry and a periodic authorization reconciliation must remove sessions that have lost access.

Token expiry alone is insufficient: it does not stop an already connected viewer. Provider removal and reconnect prevention are required acceptance criteria. If provider removal fails, mark the operation pending, retry and report the incomplete media removal to the admin. Do not claim instant removal while the provider is unreachable. Already received content cannot be recalled.

End room marks the application room closed first, blocks new tokens/messages and requests provider room deletion. Persist and retry failed provider cleanup; never mark a broadcast fully stopped until the result is confirmed. Capture tracks stop locally regardless of cleanup API outcome.

## Configuration and rollout

- Private server configuration: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET; placeholders only in examples.
- Use the existing Supabase PostgreSQL connection and custom application authentication. Supabase Auth is not introduced.
- New private tables use RLS and deny direct anon/authenticated table access, matching existing app tables. Apply a forward-only migration; do not rerun database bootstrap.
- Local synthetic fixtures stay isolated from the hosted real-client database. Streaming provider doubles must be explicitly labelled simulated.
- No automatic provider signup, billing activation, deployment or production broadcast.

## Acceptance and testing

1. A FREE member can post/reply/upload supported images in regular Community, with existing abuse controls. Anonymous requests fail; cross-author deletion fails.
2. FREE, PENDING, REJECTED and REVOKED members cannot read private Live Trade rooms/messages or obtain media tokens. A registered member cannot create/end rooms or grant themselves host privileges.
3. An admin creates a READY room without capture permission prompts. Sharing and enabling audio require explicit user actions. Failed/cancelled permissions do not produce a LIVE state.
4. Eligible members receive subscribe-only room credentials and can chat only in that room. Cross-room identifiers, forged principal IDs and duplicate sends are tested.
5. Ending a room blocks new joins/messages, stops local tracks and removes remote participants. Failed provider cleanup remains visible and retryable.
6. Membership revocation/profile changes remove active viewers and prevent cached-token reconnects; provider failure/retry and concurrent join/revoke are tested.
7. Desktop/iPad/mobile layouts, keyboard navigation, accessible controls, reduced motion and audio autoplay recovery pass browser checks.
8. Unit/integration/browser tests use isolated fixtures and provider simulations. A separate real two-browser media test confirms screen and microphone delivery before the feature is reported as production-ready. Missing provider credentials are a stated limit, not a passing broadcast test.
9. Run lint, typecheck, relevant tests, build and page smoke checks. Record exact commands/outcomes. MT5 controls remain disabled.

## References

- https://docs.livekit.io/frontends/reference/tokens-grants/
- https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants/
- https://docs.livekit.io/transport/media/publish/
