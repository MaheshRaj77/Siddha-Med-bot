-- Harden Supabase Data API exposure. The app uses server-side Prisma for
-- table access, so browser clients should not have direct public table rights.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QueryUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RetrievalDiagnostic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditAdjustment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatCostMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PricingPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromoCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillingSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IngestionJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentMetadata" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "BillingSubscription_promoCodeId_idx"
  ON "BillingSubscription" ("promoCodeId");

CREATE INDEX IF NOT EXISTS "ChatSession_userId_idx"
  ON "ChatSession" ("userId");

CREATE INDEX IF NOT EXISTS "PaymentTransaction_promoCodeId_idx"
  ON "PaymentTransaction" ("promoCodeId");

CREATE INDEX IF NOT EXISTS "RetrievalDiagnostic_chatLogId_idx"
  ON "RetrievalDiagnostic" ("chatLogId");
