ALTER TABLE "PricingPlan"
  ADD COLUMN IF NOT EXISTS "monthlyTokenLimit" INTEGER NOT NULL DEFAULT 300000;

UPDATE "PricingPlan"
SET "monthlyTokenLimit" = CASE "slug"
  WHEN 'starter' THEN 50000
  WHEN 'student' THEN 300000
  WHEN 'researcher' THEN 1200000
  WHEN 'practitioner' THEN 3500000
  WHEN 'institution' THEN 50000000
  ELSE GREATEST(COALESCE("monthlyQueryLimit", 0) * 1000, "monthlyTokenLimit")
END;
