ALTER TABLE "AgentSettings"
  ADD COLUMN IF NOT EXISTS "followUpQuestionsEnabled" BOOLEAN NOT NULL DEFAULT true;
