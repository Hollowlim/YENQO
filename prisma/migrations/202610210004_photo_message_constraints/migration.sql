ALTER TABLE "CommunityMessage" DROP CONSTRAINT "CommunityMessage_text_check";
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "community_message_content" CHECK (
 char_length("text") BETWEEN 0 AND 2000 AND
 (char_length("text") > 0 OR "imageHash" IS NOT NULL)
);
ALTER TABLE "CommunityMessage" DROP CONSTRAINT "community_image_bounds";
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "community_image_bounds" CHECK (
 ("imageData" IS NULL AND ("imageHash" IS NULL OR ("hiddenAt" IS NOT NULL AND "imageHash" ~ '^[a-f0-9]{64}$'))) OR
 ("imageData" IS NOT NULL AND "imageHash" IS NOT NULL AND "imageHash" ~ '^[a-f0-9]{64}$' AND octet_length("imageData") BETWEEN 1 AND 5242880)
);
