import { getVectorStore, getEmbeddings, getChromaClient } from "./langchain";
import { prisma } from "./db";
import { Redis } from "@upstash/redis";
import { Document } from "@langchain/core/documents";

// Initialize Upstash Redis client for caching
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? Redis.fromEnv()
  : null;

const CACHE_TTL_SECONDS = 3600; // Cache retrieval results for 1 hour

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

// ── Medical Synonyms & Tamil Botanical Mapping ─────────────────────────
const SIDDHA_SYNONYM_MAP: Record<string, string[]> = {
  "nilavembu": ["andrographis paniculata", "சிறியாநங்கை", "siriyanangai", "kiriyath", "chronic fever"],
  "seenthil": ["tinospora cordifolia", "சீந்தில்", "guduchi", "amruth", "immunity booster"],
  "karisalankanni": ["eclipta prostrata", "கரிசலாங்கண்ணி", "bhringraj", "yellow karisala", "liver tonic"],
  "adathodai": ["justicia adhatoda", "ஆடாதோடை", "vasaka", "cough", "asthma"],
  "tulasi": ["ocimum sanctum", "துளசி", "holy basil", "cold", "respiratory"],
  "kabab chini": ["piper cubeba", "வால்மிளகு", "vaalmilagu", "throat infection"],
  "murungai": ["moringa oleifera", "முруங்கை", "drumstick", "joint pain", "iron deficiency"]
};

// Query rewrite & expansion agent logic
export function expandMedicalQuery(query: string): { expandedQuery: string; synonymsUsed: string[] } {
  const words = query.toLowerCase().split(/\s+/);
  const synonymsUsed: string[] = [];
  const expandedTerms = new Set<string>();

  words.forEach(word => {
    // Strip punctuation
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    if (cleanWord.length > 2) {
      expandedTerms.add(cleanWord);
      
      // Check direct synonyms
      for (const [key, list] of Object.entries(SIDDHA_SYNONYM_MAP)) {
        if (cleanWord === key || list.includes(cleanWord)) {
          synonymsUsed.push(key);
          expandedTerms.add(key);
          list.forEach(t => expandedTerms.add(t));
        }
      }
    }
  });

  return {
    expandedQuery: Array.from(expandedTerms).join(" "),
    synonymsUsed
  };
}

// ── Vector Space Cosine Similarity for MMR ─────────────────────────────
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Reciprocal Rank Fusion (RRF) ──────────────────────────────────────
interface RRFItem {
  doc: Document;
  vectorRank?: number;
  lexicalRank?: number;
  vectorScore?: number;
  lexicalScore?: number;
}

export function performRRF(
  vectorDocs: Document[],
  lexicalDocs: Document[],
  k = 60
): { fusedDocs: Document[]; diagnostics: Map<string, { vectorRank: number; lexicalRank: number; rrfScore: number }> } {
  const docMap = new Map<string, RRFItem>();
  const diagnostics = new Map<string, { vectorRank: number; lexicalRank: number; rrfScore: number }>();

  // Helper to extract unique document key
  const getDocId = (doc: Document) => {
    return `${doc.metadata.source_file || doc.metadata.source || "unknown"}_${doc.metadata.chunk_index || 0}`;
  };

  // Process vector documents
  vectorDocs.forEach((doc, rank) => {
    const id = getDocId(doc);
    if (!docMap.has(id)) {
      docMap.set(id, { doc });
    }
    const item = docMap.get(id)!;
    item.vectorRank = rank + 1;
    item.vectorScore = doc.metadata.score;
  });

  // Process lexical documents
  lexicalDocs.forEach((doc, rank) => {
    const id = getDocId(doc);
    if (!docMap.has(id)) {
      docMap.set(id, { doc });
    }
    const item = docMap.get(id)!;
    item.lexicalRank = rank + 1;
    item.lexicalScore = doc.metadata.score;
  });

  // Compute RRF scores
  const fusedList = Array.from(docMap.entries()).map(([id, item]) => {
    const vectorRank = item.vectorRank || Infinity;
    const lexicalRank = item.lexicalRank || Infinity;

    const rrfScore = (1 / (k + vectorRank)) + (1 / (k + lexicalRank));

    // Save diagnostic data
    diagnostics.set(id, {
      vectorRank: vectorRank === Infinity ? -1 : vectorRank,
      lexicalRank: lexicalRank === Infinity ? -1 : lexicalRank,
      rrfScore
    });

    // Set combined metadata
    item.doc.metadata.vectorRank = vectorRank;
    item.doc.metadata.lexicalRank = lexicalRank;
    item.doc.metadata.rrfScore = rrfScore;
    item.doc.metadata.vectorScore = item.vectorScore || 0;
    item.doc.metadata.lexicalScore = item.lexicalScore || 0;

    return { doc: item.doc, rrfScore };
  });

  // Sort by RRF score descending
  fusedList.sort((a, b) => b.rrfScore - a.rrfScore);

  return {
    fusedDocs: fusedList.map(item => item.doc),
    diagnostics
  };
}

// ── Maximal Marginal Relevance (MMR) ──────────────────────────────────
export async function performMMR(
  docs: Document[],
  targetCount: number,
  lambda = 0.5
): Promise<Document[]> {
  if (docs.length <= targetCount) return docs;

  // Retrieve embeddings for target MMR documents
  const embeddingsModel = getEmbeddings();
  const docTexts = docs.map(d => d.pageContent);
  const docEmbeddings = await embeddingsModel.embedDocuments(docTexts);

  // Define query embedding (average of top document embeddings to represent centroid)
  const queryEmbedding = docEmbeddings[0]; // standard practice when queries are shorter than chunks

  const selectedIndices: number[] = [0]; // greedily include top document
  const remainingIndices: number[] = Array.from({ length: docs.length }, (_, i) => i).slice(1);

  while (selectedIndices.length < targetCount && remainingIndices.length > 0) {
    let bestScore = -Infinity;
    let bestIndex = -1;

    for (const candidateIdx of remainingIndices) {
      const candEmbedding = docEmbeddings[candidateIdx];
      const simToQuery = cosineSimilarity(candEmbedding, queryEmbedding);

      let maxSimToSelected = -Infinity;
      for (const selIdx of selectedIndices) {
        const selEmbedding = docEmbeddings[selIdx];
        const sim = cosineSimilarity(candEmbedding, selEmbedding);
        if (sim > maxSimToSelected) {
          maxSimToSelected = sim;
        }
      }

      // MMR Formula: lambda * similarity(doc, query) - (1 - lambda) * max_similarity(doc, selected)
      const score = lambda * simToQuery - (1 - lambda) * maxSimToSelected;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = candidateIdx;
      }
    }

    if (bestIndex === -1) break;

    selectedIndices.push(bestIndex);
    const indexInRemaining = remainingIndices.indexOf(bestIndex);
    remainingIndices.splice(indexInRemaining, 1);
  }

  return selectedIndices.map(idx => docs[idx]);
}

// ── Hybrid Retrieval Core Handler ──────────────────────────────────────
export async function hybridRetrieval(
  query: string,
  chatLogId?: string
): Promise<{
  docs: Document[];
  rewrittenQuery: string;
  diagnostics: DiagnosticMetrics;
}> {
  const startTime = Date.now();

  // 1. Synonym Query Expansion
  const { expandedQuery, synonymsUsed } = expandMedicalQuery(query);
  
  // 2. Redis Caching Layer
  const cacheKey = `retrieval_cache:${Buffer.from(query).toString("base64")}`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = cached as any;
        console.log(`[Cache Hit] Serving retrieval cache for: "${query}"`);
        return {
          docs: parsed.docs.map((d: any) => new Document({ pageContent: d.pageContent, metadata: d.metadata })),
          rewrittenQuery: parsed.rewrittenQuery,
          diagnostics: parsed.diagnostics
        };
      }
    } catch (e) {
      console.warn("Upstash Redis Cache retrieval failed:", e);
    }
  }

  // 3. Parallel Retrieval Runs
  console.log(`[Retrieval Engine] Starting Hybrid runs. Base: "${query}". Expanded: "${expandedQuery}"`);
  
  const [vectorResults, lexicalResults] = await Promise.all([
    // Vector search
    (async () => {
      try {
        const store = await getVectorStore();
        // Similarity search returning metadata scores
        const res = await store.similaritySearchWithScore(expandedQuery, 30);
        return res.map(([doc, score]) => {
          doc.metadata.score = score;
          return doc;
        });
      } catch (e) {
        console.error("Vector retrieval failed:", e);
        return [];
      }
    })(),

    // Lexical full-text PostgreSQL search
    (async () => {
      try {
        // Query postgres full-text search directly using websearch_to_tsquery
        const rawResults = await prisma.$queryRaw<Array<{
          id: string;
          fileName: string;
          chunkIndex: number;
          content: string;
          metadata: string;
          rank: number;
        }>>`
          SELECT 
            id, 
            "fileName", 
            "chunkIndex", 
            content, 
            metadata, 
            ts_rank_cd(to_tsvector('english', content), query) as rank
          FROM "DocumentChunk", 
               websearch_to_tsquery('english', ${expandedQuery}) as query
          WHERE to_tsvector('english', content) @@ query
          ORDER BY rank DESC
          LIMIT 30;
        `;

        return rawResults.map(r => new Document({
          pageContent: r.content,
          metadata: {
            source_file: r.fileName,
            chunk_index: r.chunkIndex,
            score: r.rank,
            ...(typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata)
          }
        }));
      } catch (e) {
        console.error("Postgres FTS Lexical retrieval failed:", e);
        return [];
      }
    })()
  ]);

  // 4. Reciprocal Rank Fusion (RRF)
  const { fusedDocs, diagnostics: rrfMap } = performRRF(vectorResults, lexicalResults);

  // 5. MMR Diversity Filtering (Top 10 diverse documents)
  const diverseDocs = await performMMR(fusedDocs, Math.min(10, fusedDocs.length), 0.5);

  const durationMs = Date.now() - startTime;

  // 6. Compute Telemetry Diagnostic Metrics
  const vecScores = vectorResults.map(d => d.metadata.score || 0);
  const lexScores = lexicalResults.map(d => d.metadata.score || 0);
  const rrfScores = diverseDocs.map(d => d.metadata.rrfScore || 0);

  // Calculate redundancy (overlap percentage of text chunks)
  let redundancyRatio = 0.0;
  if (diverseDocs.length > 1) {
    let duplicatedWords = 0;
    let totalWords = 0;
    const wordSet = new Set<string>();

    diverseDocs.forEach(d => {
      const words = d.pageContent.toLowerCase().split(/\s+/);
      words.forEach(w => {
        totalWords++;
        if (wordSet.has(w)) {
          duplicatedWords++;
        } else {
          wordSet.add(w);
        }
      });
    });
    redundancyRatio = duplicatedWords / totalWords;
  }

  const diagnostics: DiagnosticMetrics = {
    vectorScoreMin: vecScores.length > 0 ? Math.min(...vecScores) : 0,
    vectorScoreMax: vecScores.length > 0 ? Math.max(...vecScores) : 0,
    lexicalScoreMin: lexScores.length > 0 ? Math.min(...lexScores) : 0,
    lexicalScoreMax: lexScores.length > 0 ? Math.max(...lexScores) : 0,
    rrfScoreMin: rrfScores.length > 0 ? Math.min(...rrfScores) : 0,
    rrfScoreMax: rrfScores.length > 0 ? Math.max(...rrfScores) : 0,
    rerankScoreMin: 0.0, // Calculated during Cohere Reranking node
    rerankScoreMax: 0.0,
    redundancyRatio,
    latencyMs: durationMs
  };

  // 7. Persist Telemetry Diagnostics into PostgreSQL Async
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
        rerankScoreMin: 0.0,
        rerankScoreMax: 0.0,
        redundancyRatio
      }
    }).catch(err => console.error("Failed to save retrieval diagnostics telemetry:", err));
  }

  // 8. Cache Output in Redis
  if (redis) {
    try {
      await redis.set(
        cacheKey,
        JSON.stringify({ docs: diverseDocs, rewrittenQuery: expandedQuery, diagnostics }),
        { ex: CACHE_TTL_SECONDS }
      );
    } catch (e) {
      console.warn("Failed to write retrieval cache to Upstash:", e);
    }
  }

  return {
    docs: diverseDocs,
    rewrittenQuery: expandedQuery,
    diagnostics
  };
}
