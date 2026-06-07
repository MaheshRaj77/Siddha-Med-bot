ALTER TABLE "DocumentMetadata"
  ADD COLUMN IF NOT EXISTS "documentHash" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentMetadata_fileName_key"
  ON "DocumentMetadata" ("fileName");

CREATE INDEX IF NOT EXISTS "DocumentMetadata_documentHash_idx"
  ON "DocumentMetadata" ("documentHash");

ALTER TABLE "DocumentChunk"
  ADD COLUMN IF NOT EXISTS "documentHash" TEXT,
  ADD COLUMN IF NOT EXISTS "chunkHash" TEXT,
  ADD COLUMN IF NOT EXISTS "tokenCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "pageNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "sectionTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "DocumentChunk_documentHash_idx"
  ON "DocumentChunk" ("documentHash");

CREATE INDEX IF NOT EXISTS "DocumentChunk_chunkHash_idx"
  ON "DocumentChunk" ("chunkHash");

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentChunk_fileName_chunkIndex_key"
  ON "DocumentChunk" ("fileName", "chunkIndex");

CREATE INDEX IF NOT EXISTS "DocumentChunk_content_fts_idx"
  ON "DocumentChunk"
  USING GIN (to_tsvector('english', content));
