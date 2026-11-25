ALTER TABLE "CommunityMessage" ADD COLUMN "imageData" BYTEA, ADD COLUMN "imageHash" TEXT;
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "community_image_bounds" CHECK (
 ("imageData" IS NULL AND ("imageHash" IS NULL OR "hiddenAt" IS NOT NULL)) OR
 ("imageData" IS NOT NULL AND "imageHash" ~ '^[a-f0-9]{64}$' AND octet_length("imageData") BETWEEN 1 AND 5242880)
);
