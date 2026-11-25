CREATE TABLE "CommunityMessage" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "clientKey" TEXT NOT NULL,
 "text" TEXT NOT NULL CHECK (char_length("text") BETWEEN 1 AND 2000),
 "chartUrl" TEXT CHECK ("chartUrl" IS NULL OR char_length("chartUrl") <= 1000),
 "replyToId" TEXT REFERENCES "CommunityMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "hiddenAt" TIMESTAMP(3),
 CHECK ("replyToId" IS NULL OR "replyToId" <> "id")
);
CREATE UNIQUE INDEX "CommunityMessage_authorId_clientKey_key" ON "CommunityMessage"("authorId", "clientKey");
CREATE INDEX "CommunityMessage_createdAt_id_idx" ON "CommunityMessage"("createdAt", "id");
CREATE INDEX "CommunityMessage_replyToId_idx" ON "CommunityMessage"("replyToId");
CREATE TABLE "CommunityReport" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "messageId" TEXT NOT NULL REFERENCES "CommunityMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "reporterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "reason" TEXT NOT NULL CHECK (char_length("reason") BETWEEN 5 AND 500),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CommunityReport_messageId_reporterId_key" ON "CommunityReport"("messageId", "reporterId");
CREATE INDEX "CommunityReport_createdAt_id_idx" ON "CommunityReport"("createdAt", "id");
