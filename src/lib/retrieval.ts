import { Document } from "@langchain/core/documents";
import { prisma } from "./db";
import { buildRetrievalCacheKey, getRetrievalCacheVersion, redis, RETRIEVAL_CACHE_TTL_SECONDS } from "./rag/cache";
import { getEmbeddings, getVectorStore } from "./rag/store";
import type { DiagnosticMetrics, RagDocument, SerializedRagDocument } from "./rag/types";
import { withTimeout } from "./utils/timeout";

// ── Medical Synonyms & Tamil Botanical Mapping ─────────────────────────
const SIDDHA_SYNONYM_MAP: Record<string, string[]> = {
  "nilavembu": ["andrographis paniculata", "சிறியாநங்கை", "siriyanangai", "kiriyath", "chronic fever"],
  "seenthil": ["tinospora cordifolia", "சீந்தில்", "guduchi", "amruth", "immunity booster"],
  "karisalankanni": ["eclipta prostrata", "கரிசலாங்கண்ணி", "bhringraj", "yellow karisala", "liver tonic"],
  "adathodai": ["justicia adhatoda", "ஆடாதோடை", "vasaka", "cough", "asthma"],
  "tulasi": ["ocimum sanctum", "துளசி", "holy basil", "cold", "respiratory"],
  "kabab chini": ["piper cubeba", "வால்மிளகு", "vaalmilagu", "throat infection"],
  "murungai": ["moringa oleifera", "முருங்கை", "drumstick", "joint pain", "iron deficiency"],
};

type RetrievalCachePayload = {
  docs: SerializedRagDocument[];
  rewrittenQuery: string;
  diagnostics: DiagnosticMetrics;
};

interface RRFItem {
  doc: RagDocument;
  vectorRank?: number;
  lexicalRank?: number;
  vectorScore?: number;
  lexicalScore?: number;
}

export type { DiagnosticMetrics };

export function expandMedicalQuery(query: string): { expandedQuery: string; synonymsUsed: string[] } {
  const words = query.toLowerCase().split(/\s+/);
  const synonymsUsed: string[] = [];
  const expandedTerms = new Set<string>();

  words.forEach((word) => {
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    if (cleanWord.length <= 2) return;
    expandedTerms.add(cleanWord);

    for (const [key, list] of Object.entries(SIDDHA_SYNONYM_MAP)) {
      if (cleanWord === key || list.includes(cleanWord)) {
        synonymsUsed.push(key);
        expandedTerms.add(key);
        list.forEach((term) => expandedTerms.add(term));
      }
    }
  });

  return {
    expandedQuery: Array.from(expandedTerms).join(" "),
    synonymsUsed,
  };
}

function buildLexicalQueries(query: string, expandedQuery: string) {
  const queries = [query];
  const stopwords = new Set([
    "a",
    "an",
    "and",
    "any",
    "available",
    "can",
    "for",
    "give",
    "health",
    "help",
    "in",
    "is",
    "me",
    "medical",
    "medicine",
    "medicines",
    "of",
    "please",
    "problem",
    "recommend",
    "siddha",
    "suggest",
    "tell",
    "the",
    "to",
    "use",
    "used",
    "uses",
    "what",
    "which",
    "with",
  ]);
  const expandedTerms = expandedQuery
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) =>
      term.length > 2
      && !stopwords.has(term.toLowerCase())
      && !/^[^\p{L}\p{N}]+$/u.test(term)
    );

  for (const term of expandedTerms) {
    if (!queries.some((existing) => existing.toLowerCase() === term.toLowerCase())) {
      queries.push(term);
    }
  }

  return queries.slice(0, 24);
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getDocId(doc: RagDocument) {
  return String(
    doc.metadata.chunk_hash
    || `${doc.metadata.source_file || doc.metadata.source || "unknown"}_${doc.metadata.chunk_index || 0}`
  );
}

function getActiveChunkKeys(doc: RagDocument) {
  const sourceFile = typeof doc.metadata.source_file === "string" ? doc.metadata.source_file : undefined;
  const chunkIndex = typeof doc.metadata.chunk_index === "number" ? doc.metadata.chunk_index : undefined;
  const chunkHash = typeof doc.metadata.chunk_hash === "string" ? doc.metadata.chunk_hash : undefined;
  const pairKey = sourceFile && typeof chunkIndex === "number" ? `${sourceFile}:${chunkIndex}` : undefined;

  return { chunkHash, pairKey, sourceFile, chunkIndex };
}

async function filterActiveKnowledgeDocs(docs: RagDocument[]) {
  if (docs.length === 0) return docs;

  const chunkHashes = Array.from(new Set(
    docs
      .map((doc) => getActiveChunkKeys(doc).chunkHash)
      .filter((hash): hash is string => Boolean(hash))
  ));
  const chunkPairs = docs
    .map((doc) => getActiveChunkKeys(doc))
    .filter((keys): keys is ReturnType<typeof getActiveChunkKeys> & { sourceFile: string; chunkIndex: number } =>
      Boolean(keys.sourceFile) && typeof keys.chunkIndex === "number"
    );
  if (chunkHashes.length === 0 && chunkPairs.length === 0) return [];

  const activeChunks = await prisma.documentChunk.findMany({
    where: {
      OR: [
        ...(chunkHashes.length > 0 ? [{ chunkHash: { in: chunkHashes } }] : []),
        ...chunkPairs.map(({ sourceFile, chunkIndex }) => ({ fileName: sourceFile, chunkIndex })),
      ],
    },
    select: {
      fileName: true,
      chunkIndex: true,
      chunkHash: true,
    },
  });
  const sourceFiles = Array.from(new Set(activeChunks.map((chunk) => chunk.fileName)));
  if (sourceFiles.length === 0) return [];

  const activeSourceFiles = new Set(
    (await prisma.documentMetadata.findMany({
      where: {
        fileName: { in: sourceFiles },
        isActive: true,
      },
      select: { fileName: true },
    })).map((row) => row.fileName)
  );

  const activeChunksFromActiveSources = activeChunks.filter((chunk) => activeSourceFiles.has(chunk.fileName));
  const activeHashes = new Set(activeChunksFromActiveSources.map((chunk) => chunk.chunkHash).filter((hash): hash is string => Boolean(hash)));
  const activePairs = new Set(activeChunksFromActiveSources.map((chunk) => `${chunk.fileName}:${chunk.chunkIndex}`));

  return docs.filter((doc) => {
    const { chunkHash, pairKey } = getActiveChunkKeys(doc);
    return Boolean((chunkHash && activeHashes.has(chunkHash)) || (pairKey && activePairs.has(pairKey)));
  });
}

export function performRRF(
  vectorDocs: RagDocument[],
  lexicalDocs: RagDocument[],
  k = 60
): { fusedDocs: RagDocument[]; diagnostics: Map<string, { vectorRank: number; lexicalRank: number; rrfScore: number }> } {
  const docMap = new Map<string, RRFItem>();
  const diagnostics = new Map<string, { vectorRank: number; lexicalRank: number; rrfScore: number }>();

  vectorDocs.forEach((doc, rank) => {
    const id = getDocId(doc);
    const item = docMap.get(id) || { doc };
    item.vectorRank = rank + 1;
    item.vectorScore = typeof doc.metadata.score === "number" ? doc.metadata.score : 0;
    docMap.set(id, item);
  });

  lexicalDocs.forEach((doc, rank) => {
    const id = getDocId(doc);
    const item = docMap.get(id) || { doc };
    item.lexicalRank = rank + 1;
    item.lexicalScore = typeof doc.metadata.score === "number" ? doc.metadata.score : 0;
    docMap.set(id, item);
  });

  const fusedList = Array.from(docMap.entries()).map(([id, item]) => {
    const vectorRank = item.vectorRank || Infinity;
    const lexicalRank = item.lexicalRank || Infinity;
    const rrfScore = (1 / (k + vectorRank)) + (1 / (k + lexicalRank));

    diagnostics.set(id, {
      vectorRank: vectorRank === Infinity ? -1 : vectorRank,
      lexicalRank: lexicalRank === Infinity ? -1 : lexicalRank,
      rrfScore,
    });

    item.doc.metadata.vectorRank = vectorRank === Infinity ? -1 : vectorRank;
    item.doc.metadata.lexicalRank = lexicalRank === Infinity ? -1 : lexicalRank;
    item.doc.metadata.rrfScore = rrfScore;
    item.doc.metadata.vectorScore = item.vectorScore || 0;
    item.doc.metadata.lexicalScore = item.lexicalScore || 0;

    return { doc: item.doc, rrfScore };
  });

  fusedList.sort((a, b) => b.rrfScore - a.rrfScore);
  return { fusedDocs: fusedList.map((item) => item.doc), diagnostics };
}

export async function performMMR(
  query: string,
  docs: RagDocument[],
  targetCount: number,
  lambda = 0.55
): Promise<RagDocument[]> {
  if (docs.length <= targetCount) return docs;

  const embeddingsModel = getEmbeddings();
  const [queryEmbedding, docEmbeddings] = await Promise.all([
    embeddingsModel.embedQuery(query),
    embeddingsModel.embedDocuments(docs.map((doc) => doc.pageContent)),
  ]);

  const selectedIndices: number[] = [0];
  const remainingIndices = Array.from({ length: docs.length - 1 }, (_, index) => index + 1);

  while (selectedIndices.length < targetCount && remainingIndices.length > 0) {
    let bestScore = -Infinity;
    let bestIndex = -1;

    for (const candidateIdx of remainingIndices) {
      const candidateEmbedding = docEmbeddings[candidateIdx];
      const similarityToQuery = cosineSimilarity(candidateEmbedding, queryEmbedding);
      const similarityToSelected = Math.max(
        ...selectedIndices.map((selectedIdx) => cosineSimilarity(candidateEmbedding, docEmbeddings[selectedIdx]))
      );
      const score = lambda * similarityToQuery - (1 - lambda) * similarityToSelected;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = candidateIdx;
      }
    }

    if (bestIndex === -1) break;
    selectedIndices.push(bestIndex);
    remainingIndices.splice(remainingIndices.indexOf(bestIndex), 1);
  }

  return selectedIndices.map((index) => docs[index]);
}

function scoreValues(docs: RagDocument[]) {
  return docs.map((doc) => typeof doc.metadata.score === "number" ? doc.metadata.score : 0);
}

function calculateRedundancyRatio(docs: RagDocument[]) {
  if (docs.length <= 1) return 0;
  let duplicatedWords = 0;
  let totalWords = 0;
  const seen = new Set<string>();

  docs.forEach((doc) => {
    doc.pageContent.toLowerCase().split(/\s+/).forEach((word) => {
      if (!word) return;
      totalWords++;
      if (seen.has(word)) duplicatedWords++;
      else seen.add(word);
    });
  });

  return totalWords > 0 ? duplicatedWords / totalWords : 0;
}

function deserializeCachedDocs(payload: unknown): RetrievalCachePayload | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Partial<RetrievalCachePayload>;
  if (!Array.isArray(candidate.docs) || typeof candidate.rewrittenQuery !== "string" || !candidate.diagnostics) return null;
  return {
    docs: candidate.docs.filter((doc): doc is SerializedRagDocument =>
      Boolean(doc)
      && typeof doc.pageContent === "string"
      && Boolean(doc.metadata)
      && typeof doc.metadata === "object"
    ),
    rewrittenQuery: candidate.rewrittenQuery,
    diagnostics: candidate.diagnostics,
  };
}

async function vectorSearch(expandedQuery: string) {
  try {
    const store = await getVectorStore();
    const results = await store.similaritySearchWithScore(expandedQuery, 30);
    return results.map(([doc, score]) => {
      doc.metadata.score = score;
      return doc as RagDocument;
    });
  } catch (error) {
    console.error("Vector retrieval failed:", error);
    return [];
  }
}

async function lexicalSearch(query: string, expandedQuery: string) {
  try {
    const lexicalQueries = buildLexicalQueries(query, expandedQuery);
    const rawResults = await prisma.$queryRaw<Array<{
      id: string;
      fileName: string;
      chunkIndex: number;
      content: string;
      metadata: unknown;
      documentHash: string | null;
      chunkHash: string | null;
      tokenCount: number | null;
      pageNumber: number | null;
      sectionTitle: string | null;
      version: number;
      rank: number;
    }>>`
      WITH search_terms AS (
        SELECT
          term,
          CASE WHEN ordinality = 1 THEN 4.0 ELSE 1.0 END AS weight
        FROM unnest(${lexicalQueries}::text[]) WITH ORDINALITY AS terms(term, ordinality)
      ),
      ranked_chunks AS (
        SELECT
          dc.id,
          dc."fileName",
          dc."chunkIndex",
          dc.content,
          dc.metadata,
          dc."documentHash",
          dc."chunkHash",
          dc."tokenCount",
          dc."pageNumber",
          dc."sectionTitle",
          dc.version,
          SUM(search_terms.weight * ts_rank_cd(to_tsvector('english', dc.content), websearch_to_tsquery('english', search_terms.term))) as rank
        FROM "DocumentChunk" dc
        JOIN "DocumentMetadata" dm
          ON dm."fileName" = dc."fileName"
        JOIN search_terms
          ON to_tsvector('english', dc.content) @@ websearch_to_tsquery('english', search_terms.term)
        WHERE dm."isActive" = true
        GROUP BY
          dc.id,
          dc."fileName",
          dc."chunkIndex",
          dc.content,
          dc.metadata,
          dc."documentHash",
          dc."chunkHash",
          dc."tokenCount",
          dc."pageNumber",
          dc."sectionTitle",
          dc.version
      )
      SELECT *
      FROM ranked_chunks
      ORDER BY rank DESC
      LIMIT 30;
    `;

    return rawResults.map((row) => new Document({
      pageContent: row.content,
      metadata: {
        ...(row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {}),
        source_file: row.fileName,
        chunk_index: row.chunkIndex,
        document_hash: row.documentHash || undefined,
        chunk_hash: row.chunkHash || undefined,
        token_count: row.tokenCount || undefined,
        page_number: row.pageNumber || undefined,
        section_title: row.sectionTitle || undefined,
        version: row.version,
        score: row.rank,
      },
    })) as RagDocument[];
  } catch (error) {
    console.error("Postgres FTS lexical retrieval failed:", error);
    return [];
  }
}

export async function hybridRetrieval(
  query: string,
  chatLogId?: string
): Promise<{
  docs: RagDocument[];
  rewrittenQuery: string;
  diagnostics: DiagnosticMetrics;
}> {
  const startTime = Date.now();
  const { expandedQuery } = expandMedicalQuery(query);
  const cacheVersion = await getRetrievalCacheVersion();
  const cacheKey = buildRetrievalCacheKey(cacheVersion, query);

  if (redis) {
    try {
      const cached = deserializeCachedDocs(await redis.get(cacheKey));
      if (cached) {
        const activeCachedDocs = await filterActiveKnowledgeDocs(
          cached.docs.map((doc) => new Document(doc) as RagDocument)
        );
        return {
          docs: activeCachedDocs,
          rewrittenQuery: cached.rewrittenQuery,
          diagnostics: cached.diagnostics,
        };
      }
    } catch (error) {
      console.warn("Upstash Redis retrieval cache read failed:", error);
    }
  }

  const [rawVectorResults, rawLexicalResults] = await Promise.all([
    withTimeout(vectorSearch(expandedQuery), 3500, [] as RagDocument[], "Vector retrieval"),
    withTimeout(lexicalSearch(query, expandedQuery), 3500, [] as RagDocument[], "Lexical retrieval"),
  ]);
  const [vectorResults, lexicalResults] = await Promise.all([
    filterActiveKnowledgeDocs(rawVectorResults),
    filterActiveKnowledgeDocs(rawLexicalResults),
  ]);
  const { fusedDocs } = performRRF(vectorResults, lexicalResults);
  // Slice top 15 results directly instead of running heavy MMR embeddings
  const diverseDocs = fusedDocs.slice(0, Math.min(15, fusedDocs.length));
  const durationMs = Date.now() - startTime;

  const vecScores = scoreValues(vectorResults);
  const lexScores = scoreValues(lexicalResults);
  const rrfScores = diverseDocs.map((doc) => typeof doc.metadata.rrfScore === "number" ? doc.metadata.rrfScore : 0);
  const diagnostics: DiagnosticMetrics = {
    vectorScoreMin: vecScores.length > 0 ? Math.min(...vecScores) : 0,
    vectorScoreMax: vecScores.length > 0 ? Math.max(...vecScores) : 0,
    lexicalScoreMin: lexScores.length > 0 ? Math.min(...lexScores) : 0,
    lexicalScoreMax: lexScores.length > 0 ? Math.max(...lexScores) : 0,
    rrfScoreMin: rrfScores.length > 0 ? Math.min(...rrfScores) : 0,
    rrfScoreMax: rrfScores.length > 0 ? Math.max(...rrfScores) : 0,
    rerankScoreMin: 0,
    rerankScoreMax: 0,
    redundancyRatio: calculateRedundancyRatio(diverseDocs),
    latencyMs: durationMs,
  };

  if (chatLogId) {
    prisma.retrievalDiagnostic.create({
      data: {
        chatLogId,
        query,
        rewrittenQuery: expandedQuery,
        latencyMs: durationMs,
        vectorScoreMin: diagnostics.vectorScoreMin,
        vectorScoreMax: diagnostics.vectorScoreMax,
        lexicalScoreMin: diagnostics.lexicalScoreMin,
        lexicalScoreMax: diagnostics.lexicalScoreMax,
        rrfScoreMin: diagnostics.rrfScoreMin,
        rrfScoreMax: diagnostics.rrfScoreMax,
        rerankScoreMin: 0,
        rerankScoreMax: 0,
        redundancyRatio: diagnostics.redundancyRatio,
      },
    }).catch((error) => console.error("Failed to save retrieval diagnostics telemetry:", error));
  }

  if (redis) {
    try {
      await redis.set(
        cacheKey,
        JSON.stringify({
          docs: diverseDocs.map((doc) => ({ pageContent: doc.pageContent, metadata: doc.metadata })),
          rewrittenQuery: expandedQuery,
          diagnostics,
        }),
        { ex: RETRIEVAL_CACHE_TTL_SECONDS }
      );
    } catch (error) {
      console.warn("Failed to write retrieval cache to Upstash:", error);
    }
  }

  return {
    docs: diverseDocs,
    rewrittenQuery: expandedQuery,
    diagnostics,
  };
}
