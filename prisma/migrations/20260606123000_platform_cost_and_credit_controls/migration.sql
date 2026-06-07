-- Platform hardening: manual credit ledger, answer cost metrics, and admin query indexes.

CREATE TABLE IF NOT EXISTS "CreditAdjustment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actorId" TEXT,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatCostMetric" (
  "id" TEXT NOT NULL,
  "chatLogId" TEXT NOT NULL,
  "userId" TEXT,
  "planSlug" TEXT,
  "model" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostMinor" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sourceCount" INTEGER NOT NULL DEFAULT 0,
  "cachedRetrieval" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatCostMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChatCostMetric_chatLogId_key"
  ON "ChatCostMetric" ("chatLogId");

CREATE INDEX IF NOT EXISTS "CreditAdjustment_userId_periodStart_idx"
  ON "CreditAdjustment" ("userId", "periodStart");

CREATE INDEX IF NOT EXISTS "CreditAdjustment_actorId_createdAt_idx"
  ON "CreditAdjustment" ("actorId", "createdAt");

CREATE INDEX IF NOT EXISTS "ChatCostMetric_userId_createdAt_idx"
  ON "ChatCostMetric" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "ChatCostMetric_planSlug_createdAt_idx"
  ON "ChatCostMetric" ("planSlug", "createdAt");

CREATE INDEX IF NOT EXISTS "ChatCostMetric_createdAt_idx"
  ON "ChatCostMetric" ("createdAt");

CREATE INDEX IF NOT EXISTS "ChatLog_userId_timestamp_idx"
  ON "ChatLog" ("userId", "timestamp");

CREATE INDEX IF NOT EXISTS "ChatLog_sessionId_timestamp_idx"
  ON "ChatLog" ("sessionId", "timestamp");

CREATE INDEX IF NOT EXISTS "ChatLog_timestamp_idx"
  ON "ChatLog" ("timestamp");

ALTER TABLE "CreditAdjustment"
  ADD CONSTRAINT "CreditAdjustment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditAdjustment"
  ADD CONSTRAINT "CreditAdjustment_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatCostMetric"
  ADD CONSTRAINT "ChatCostMetric_chatLogId_fkey"
  FOREIGN KEY ("chatLogId") REFERENCES "ChatLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatCostMetric"
  ADD CONSTRAINT "ChatCostMetric_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
