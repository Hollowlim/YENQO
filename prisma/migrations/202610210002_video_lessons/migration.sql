CREATE TABLE "VideoLesson" (
 "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
 "status" "EditorialStatus" NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1,
 "filename" TEXT UNIQUE, "bytes" INTEGER, "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "publishedAt" TIMESTAMP(3),
 CONSTRAINT "lesson_text" CHECK (length("title") BETWEEN 1 AND 120 AND length("description") BETWEEN 1 AND 6000),
 CONSTRAINT "lesson_video" CHECK (("filename" IS NULL AND "bytes" IS NULL) OR ("filename" ~ '^[a-f0-9-]{36}\.mp4$' AND "bytes" BETWEEN 24 AND 524288000)),
 CONSTRAINT "lesson_published" CHECK ("status" <> 'PUBLISHED' OR ("filename" IS NOT NULL AND "publishedAt" IS NOT NULL)),
 CONSTRAINT "lesson_version" CHECK ("version" > 0)
);
CREATE INDEX "VideoLesson_status_createdAt_id_idx" ON "VideoLesson"("status", "createdAt", "id");
