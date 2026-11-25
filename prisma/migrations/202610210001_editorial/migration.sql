CREATE TYPE "EditorialStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "MarketBias" AS ENUM ('BULLISH', 'BEARISH', 'SIDEWAY');
CREATE TABLE "DailyPlan" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "planDate" TEXT NOT NULL,
 "title" TEXT NOT NULL CHECK (char_length("title") BETWEEN 1 AND 120),
 "description" TEXT NOT NULL CHECK (char_length("description") BETWEEN 1 AND 6000),
 "bias" "MarketBias" NOT NULL,
 "status" "EditorialStatus" NOT NULL DEFAULT 'DRAFT',
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
 "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "publishedAt" TIMESTAMP(3),
 CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL)
);
CREATE UNIQUE INDEX "DailyPlan_planDate_key" ON "DailyPlan"("planDate");
CREATE INDEX "DailyPlan_status_planDate_idx" ON "DailyPlan"("status", "planDate");
CREATE TABLE "ManualSignal" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "requestKey" TEXT NOT NULL,
 "title" TEXT NOT NULL CHECK (char_length("title") BETWEEN 1 AND 120),
 "side" TEXT NOT NULL CHECK ("side" IN ('BUY', 'SELL')),
 "category" TEXT NOT NULL CHECK ("category" IN ('SCALPING', 'INTERDAY')),
 "zoneLow" DECIMAL(14,3) NOT NULL CHECK ("zoneLow" > 0),
 "zoneHigh" DECIMAL(14,3) NOT NULL,
 "sl" DECIMAL(14,3) NOT NULL CHECK ("sl" > 0),
 "tp1" DECIMAL(14,3) NOT NULL CHECK ("tp1" > 0),
 "tp2" DECIMAL(14,3) NOT NULL CHECK ("tp2" > 0),
 "tp3" DECIMAL(14,3) NOT NULL CHECK ("tp3" > 0),
 "notes" TEXT NOT NULL DEFAULT '' CHECK (char_length("notes") <= 1500),
 "status" "EditorialStatus" NOT NULL DEFAULT 'DRAFT',
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
 "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "publishedAt" TIMESTAMP(3),
 CHECK ("zoneHigh" > "zoneLow"),
 CHECK (("side" = 'BUY' AND "sl" < "zoneLow" AND "tp1" > "zoneHigh" AND "tp2" > "tp1" AND "tp3" > "tp2") OR ("side" = 'SELL' AND "sl" > "zoneHigh" AND "tp1" < "zoneLow" AND "tp2" < "tp1" AND "tp3" < "tp2")),
 CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL)
);
CREATE UNIQUE INDEX "ManualSignal_requestKey_key" ON "ManualSignal"("requestKey");
CREATE INDEX "ManualSignal_status_createdAt_id_idx" ON "ManualSignal"("status", "createdAt", "id");
