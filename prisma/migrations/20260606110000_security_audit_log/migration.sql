CREATE TABLE IF NOT EXISTS "SecurityAuditLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "details" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SecurityAuditLog"
  ADD CONSTRAINT "SecurityAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SecurityAuditLog_action_createdAt_idx"
  ON "SecurityAuditLog" ("action", "createdAt");

CREATE INDEX IF NOT EXISTS "SecurityAuditLog_actorId_createdAt_idx"
  ON "SecurityAuditLog" ("actorId", "createdAt");
