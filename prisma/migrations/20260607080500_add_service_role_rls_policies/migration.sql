-- Explicit backend-only RLS policies for tables that are managed by the app
-- server. Browser roles remain locked out because direct grants were revoked.

CREATE POLICY "service_role_all_agent_settings"
  ON "AgentSettings"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_billing_subscription"
  ON "BillingSubscription"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_chat_cost_metric"
  ON "ChatCostMetric"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_credit_adjustment"
  ON "CreditAdjustment"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_document_chunk"
  ON "DocumentChunk"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_evaluation_run"
  ON "EvaluationRun"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_payment_transaction"
  ON "PaymentTransaction"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_pricing_plan"
  ON "PricingPlan"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_promo_code"
  ON "PromoCode"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_query_usage"
  ON "QueryUsage"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_retrieval_diagnostic"
  ON "RetrievalDiagnostic"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_security_audit_log"
  ON "SecurityAuditLog"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_all_user"
  ON "User"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
