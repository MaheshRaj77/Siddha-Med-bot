UPDATE "PricingPlan"
SET "name" = CASE "slug"
  WHEN 'student' THEN 'Plus'
  WHEN 'researcher' THEN 'Pro'
  WHEN 'practitioner' THEN 'Pro Max'
  WHEN 'institution' THEN 'Ultra'
  ELSE "name"
END
WHERE "slug" IN ('student', 'researcher', 'practitioner', 'institution');
