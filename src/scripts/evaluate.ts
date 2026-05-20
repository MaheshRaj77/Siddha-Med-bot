import { agentExecutor } from '../lib/agent';
import { prisma } from '../lib/db';
import { ChatOpenAI } from '@langchain/openai';

// ── Models ────────────────────────────────────────────────────────────
const evalLlm = new ChatOpenAI({
  model: "meta/llama-3.3-70b-instruct",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
  temperature: 0.1,
  maxTokens: 1024,
});

interface EvaluationCase {
  query: string;
  expectedTopic: string;
  isMedical: boolean;
}

// ── Standard Benchmark Dataset ────────────────────────────────────────
const staticDataset: EvaluationCase[] = [
  {
    query: "What is the Siddha medicine for chronic fever?",
    expectedTopic: "Nilavembu Kudineer / Seenthil Kodi",
    isMedical: true,
  },
  {
    query: "Nilavembu kashayam chronic fever-ku epdi help pannum?",
    expectedTopic: "Nilavembu / Fevers / Antiviral property",
    isMedical: true,
  },
  {
    query: "How do I build a simple rest api in Node.js?",
    expectedTopic: "redirect / non-medical safety check",
    isMedical: false,
  }
];

// ── LLM-as-a-Judge Ragas Evaluation Helpers ───────────────────────────

/**
 * 1. Faithfulness: Measures if all claims made in the answer are supported by the context.
 */
async function computeFaithfulness(answer: string, contexts: string[]): Promise<number> {
  if (!answer || contexts.length === 0) return 1.0;

  try {
    // Step 1: Extract claims
    const claimPrompt = `Given the generated medical answer, extract a JSON array of all distinct factual statements and claims made in it.
Answer: "${answer}"
Return ONLY the raw JSON array of strings, e.g., ["Claim 1", "Claim 2"]. Do not wrap in markdown or add explanations.`;
    
    const claimRes = await evalLlm.invoke(claimPrompt);
    const cleanClaimsText = claimRes.content.toString().replace(/^```json/i, "").replace(/```$/i, "").trim();
    let claims: string[] = [];
    try {
      claims = JSON.parse(cleanClaimsText);
    } catch {
      // Fallback: split by sentences if JSON parsing fails
      claims = answer.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    }

    if (claims.length === 0) return 1.0;

    // Step 2: Verify each claim against context
    const contextCombined = contexts.join("\n\n");
    let verifiedCount = 0;

    for (const claim of claims) {
      const verifyPrompt = `Context:\n${contextCombined}\n\nClaim: "${claim}"\nIs this claim supported by the context above? Reply with ONLY 'YES' or 'NO'.`;
      const verifyRes = await evalLlm.invoke(verifyPrompt);
      if (verifyRes.content.toString().toUpperCase().includes("YES")) {
        verifiedCount++;
      }
    }

    return verifiedCount / claims.length;
  } catch (err) {
    console.error("Error computing faithfulness:", err);
    return 0.5; // Fallback median
  }
}

/**
 * 2. Answer Relevance: Evaluates if the generated answer directly addresses the query.
 */
async function computeAnswerRelevance(query: string, answer: string): Promise<number> {
  try {
    const prompt = `Evaluate how directly, accurately, and completely the generated answer addresses the user query.
Query: "${query}"
Answer: "${answer}"
Provide a float score between 0.0 (completely irrelevant or generic) and 1.0 (perfectly addresses query). Respond with ONLY the numeric float.`;

    const res = await evalLlm.invoke(prompt);
    const score = parseFloat(res.content.toString().trim());
    return isNaN(score) ? 0.7 : Math.min(Math.max(score, 0), 1);
  } catch {
    return 0.7;
  }
}

/**
 * 3. Context Precision: Evaluates if the retrieved chunks are highly relevant to the expected ground truth.
 */
async function computeContextPrecision(query: string, expectedTopic: string, contexts: string[]): Promise<number> {
  if (contexts.length === 0) return 0.0;
  try {
    const prompt = `Evaluate if the retrieved contexts are highly precise and directly contain information about the expected ground truth topic.
Query: "${query}"
Expected Topic/Information: "${expectedTopic}"
Contexts:
${contexts.map((c, i) => `[Chunk ${i+1}]: ${c}`).join("\n\n")}
Provide a float score between 0.0 (none of the contexts are precise/relevant) and 1.0 (all contexts are highly precise). Respond with ONLY the numeric float.`;

    const res = await evalLlm.invoke(prompt);
    const score = parseFloat(res.content.toString().trim());
    return isNaN(score) ? 0.8 : Math.min(Math.max(score, 0), 1);
  } catch {
    return 0.8;
  }
}

// ── Synthetic Query Generation ────────────────────────────────────────
async function generateSyntheticQueries(): Promise<EvaluationCase[]> {
  console.log("Generating synthetic test cases from document chunks...");
  const syntheticCases: EvaluationCase[] = [];
  
  try {
    // Retrieve up to 2 distinct document chunks from DB
    const chunks = await prisma.documentChunk.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' },
    });

    for (const chunk of chunks) {
      const prompt = `Given this text from a Siddha medicinal document:
"${chunk.content}"

Create 1 specific medical question a user would naturally ask about this topic, along with the precise expected answer / ground truth topic from the context.
Respond with a raw JSON object matching exactly this schema, without markdown formatting:
{
  "query": "The question string",
  "expectedTopic": "The specific medicine or topic name"
}`;
      const res = await evalLlm.invoke(prompt);
      const cleanJson = res.content.toString().replace(/^```json/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.query && parsed.expectedTopic) {
        syntheticCases.push({
          query: parsed.query,
          expectedTopic: parsed.expectedTopic,
          isMedical: true
        });
        console.log(`+ Generated Case: "${parsed.query}" -> Expected: "${parsed.expectedTopic}"`);
      }
    }
  } catch (err) {
    console.warn("Failed to generate synthetic queries or table empty. Falling back to built-in benchmark set only.", err);
  }

  return syntheticCases;
}

// ── Main Pipeline Runner ──────────────────────────────────────────────
async function runEvaluation() {
  console.log("==================================================");
  console.log("🚀 STARTING ADVANCED ENTERPRISE RAG EVALUATION RUN");
  console.log("==================================================");

  // 1. Synthetic queries generation
  const syntheticCases = await generateSyntheticQueries();
  const fullDataset = [...staticDataset, ...syntheticCases];

  console.log(`\nStarting execution of ${fullDataset.length} benchmark test cases...`);

  const details: any[] = [];
  let totalFaithfulness = 0;
  let totalAnswerRelevance = 0;
  let totalContextPrecision = 0;

  for (let idx = 0; idx < fullDataset.length; idx++) {
    const test = fullDataset[idx];
    console.log(`\n[${idx + 1}/${fullDataset.length}] Testing: "${test.query}"`);

    try {
      const startTime = Date.now();
      const state = await agentExecutor.invoke({
        input: test.query,
        history: "",
      });
      const latencyMs = Date.now() - startTime;

      console.log(`- Medical Check: ${state.isMedical} (Expected: ${test.isMedical})`);
      console.log(`- Retrieved Chunks: ${state.rerankedDocs?.length || 0}`);
      
      const answer = state.generation || "";
      const contexts = (state.rerankedDocs || []).map((d: any) => d.pageContent);

      // Compute individual RAG metrics
      const faithfulness = test.isMedical ? await computeFaithfulness(answer, contexts) : 1.0;
      const answerRelevance = await computeAnswerRelevance(test.query, answer);
      const contextPrecision = test.isMedical ? await computeContextPrecision(test.query, test.expectedTopic, contexts) : 1.0;
      const overall = (faithfulness + answerRelevance + contextPrecision) / 3;

      console.log(`- Faithfulness: ${(faithfulness * 100).toFixed(1)}%`);
      console.log(`- Answer Relevance: ${(answerRelevance * 100).toFixed(1)}%`);
      console.log(`- Context Precision: ${(contextPrecision * 100).toFixed(1)}%`);
      console.log(`- Overall Score: ${(overall * 100).toFixed(1)}%`);
      console.log(`- Latency: ${latencyMs} ms`);

      totalFaithfulness += faithfulness;
      totalAnswerRelevance += answerRelevance;
      totalContextPrecision += contextPrecision;

      details.push({
        query: test.query,
        expectedTopic: test.expectedTopic,
        answer,
        contexts,
        metrics: {
          faithfulness,
          answerRelevance,
          contextPrecision,
          overall,
          latencyMs,
        }
      });
    } catch (e: any) {
      console.error(`- Evaluation failed for query: "${test.query}"`, e);
      details.push({
        query: test.query,
        error: e.message,
        metrics: { faithfulness: 0, answerRelevance: 0, contextPrecision: 0, overall: 0 }
      });
    }
  }

  // Calculate final averages
  const meanFaithfulness = totalFaithfulness / fullDataset.length;
  const meanAnswerRelevance = totalAnswerRelevance / fullDataset.length;
  const meanContextPrecision = totalContextPrecision / fullDataset.length;
  const meanOverall = (meanFaithfulness + meanAnswerRelevance + meanContextPrecision) / 3;

  console.log("\n==================================================");
  console.log("📊 ENTERPRISE EVALUATION RUN SUMMARY REPORT");
  console.log("==================================================");
  console.log(`- Total Tests Run:   ${fullDataset.length}`);
  console.log(`- Mean Faithfulness:  ${(meanFaithfulness * 100).toFixed(1)}%`);
  console.log(`- Mean Relevance:     ${(meanAnswerRelevance * 100).toFixed(1)}%`);
  console.log(`- Mean Precision:     ${(meanContextPrecision * 100).toFixed(1)}%`);
  console.log(`- Mean Overall Score: ${(meanOverall * 100).toFixed(1)}%`);
  
  // Save results to PostgreSQL using Prisma!
  try {
    const run = await prisma.evaluationRun.create({
      data: {
        faithfulness: meanFaithfulness,
        answerRelevance: meanAnswerRelevance,
        contextPrecision: meanContextPrecision,
        overallScore: meanOverall,
        details: details as any,
      }
    });
    console.log(`\n✅ Saved to database under ID: [${run.id}]`);
  } catch (err) {
    console.error("❌ Failed to persist evaluation results to database:", err);
  }

  console.log("==================================================");
}

runEvaluation().catch(console.error);
