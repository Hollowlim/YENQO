ALTER TABLE "User" ADD COLUMN "mentorApprovedAt" TIMESTAMP(3);

CREATE TABLE "DiscussionRoom" (
 "id" TEXT PRIMARY KEY,
 "title" TEXT NOT NULL CHECK (char_length("title") BETWEEN 3 AND 80),
 "description" TEXT NOT NULL DEFAULT '' CHECK (char_length("description") <= 500),
 "visibility" TEXT NOT NULL DEFAULT 'PUBLIC' CHECK ("visibility" IN ('PUBLIC','PRIVATE')),
 "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "archivedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "DiscussionRoom_visibility_archivedAt_createdAt_idx" ON "DiscussionRoom"("visibility","archivedAt","createdAt");

CREATE TABLE "RoomMember" (
 "roomId" TEXT NOT NULL REFERENCES "DiscussionRoom"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "role" TEXT NOT NULL DEFAULT 'MEMBER' CHECK ("role" IN ('OWNER','MODERATOR','MEMBER')),
 "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("roomId","userId")
);
CREATE INDEX "RoomMember_userId_idx" ON "RoomMember"("userId");

CREATE TABLE "RoomInvite" (
 "id" TEXT PRIMARY KEY,
 "roomId" TEXT NOT NULL REFERENCES "DiscussionRoom"("id") ON DELETE CASCADE,
 "tokenHash" TEXT NOT NULL UNIQUE CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
 "createdById" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3),
 "revokedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RoomInvite_roomId_idx" ON "RoomInvite"("roomId");

CREATE TABLE "RoomJoinRequest" (
 "roomId" TEXT NOT NULL REFERENCES "DiscussionRoom"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','APPROVED','DECLINED')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "decidedAt" TIMESTAMP(3),
 PRIMARY KEY ("roomId","userId")
);
CREATE INDEX "RoomJoinRequest_roomId_status_idx" ON "RoomJoinRequest"("roomId","status");

CREATE TABLE "RoomMessage" (
 "id" TEXT PRIMARY KEY,
 "roomId" TEXT NOT NULL REFERENCES "DiscussionRoom"("id") ON DELETE CASCADE,
 "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "clientKey" TEXT NOT NULL,
 "kind" TEXT NOT NULL DEFAULT 'MESSAGE' CHECK ("kind" IN ('MESSAGE','ANALYSIS','ANNOUNCEMENT')),
 "text" TEXT NOT NULL CHECK (char_length("text") BETWEEN 1 AND 2000),
 "chartUrl" TEXT CHECK ("chartUrl" IS NULL OR "chartUrl" LIKE 'https://%'),
 "pinnedAt" TIMESTAMP(3),
 "hiddenAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "RoomMessage_authorId_clientKey_key" ON "RoomMessage"("authorId","clientKey");
CREATE INDEX "RoomMessage_roomId_createdAt_id_idx" ON "RoomMessage"("roomId","createdAt","id");

ALTER TABLE "DiscussionRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomJoinRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomMessage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "DiscussionRoom","RoomMember","RoomInvite","RoomJoinRequest","RoomMessage" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "DiscussionRoom","RoomMember","RoomInvite","RoomJoinRequest","RoomMessage" FROM anon; END IF;
 IF EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "DiscussionRoom","RoomMember","RoomInvite","RoomJoinRequest","RoomMessage" FROM authenticated; END IF;
END $$;
