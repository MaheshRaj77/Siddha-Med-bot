import type { Document } from "@langchain/core/documents";

export type RagMetadata = {
  source_file: string;
  document_hash: string;
  chunk_hash: string;
  chunk_index: number;
  token_count: number;
  type: string;
  page_number?: number;
  section_title?: string;
  version: number;
  score?: number;
  vectorRank?: number;
  lexicalRank?: number;
  rrfScore?: number;
  vectorScore?: number;
  lexicalScore?: number;
  rerankScore?: number;
};

export type RagDocument = Document<Record<string, unknown> & Partial<RagMetadata>>;

export type SerializedRagDocument = {
  pageContent: string;
  metadata: Record<string, unknown>;
};

export interface DiagnosticMetrics {
  vectorScoreMin: number;
  vectorScoreMax: number;
  lexicalScoreMin: number;
  lexicalScoreMax: number;
  rrfScoreMin: number;
  rrfScoreMax: number;
  rerankScoreMin: number;
  rerankScoreMax: number;
  redundancyRatio: number;
  latencyMs: number;
}
