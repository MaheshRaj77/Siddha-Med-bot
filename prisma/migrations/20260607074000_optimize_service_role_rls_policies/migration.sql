DROP POLICY IF EXISTS "service_role_all_chat_log" ON "ChatLog";
CREATE POLICY "service_role_all_chat_log"
  ON "ChatLog"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "service_role_all_chat_session" ON "ChatSession";
CREATE POLICY "service_role_all_chat_session"
  ON "ChatSession"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "service_role_all_document_metadata" ON "DocumentMetadata";
CREATE POLICY "service_role_all_document_metadata"
  ON "DocumentMetadata"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "service_role_all_ingestion_job" ON "IngestionJob";
CREATE POLICY "service_role_all_ingestion_job"
  ON "IngestionJob"
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
