import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { CohereClient } from "cohere-ai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { hybridRetrieval } from "./retrieval";
import { prisma } from "./db";

// ── State Definition ──────────────────────────────────────────────────
export const GraphState = Annotation.Root({
  input: Annotation<string>(),
  history: Annotation<string>(),
  isMedical: Annotation<boolean>(),
  chatLogId: Annotation<string>(),
  retrievedDocs: Annotation<any[]>(),
  rerankedDocs: Annotation<any[]>(),
  generation: Annotation<string>(),
  symptomsToAsk: Annotation<string[]>(),
  needsDoctor: Annotation<boolean>(),
  verified: Annotation<boolean>(),
});

// ── Models ────────────────────────────────────────────────────────────
const primaryLlm = new ChatOpenAI({
  model: "meta/llama-3.3-70b-instruct",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
  temperature: 0.2,
  maxTokens: 2048,
});

const fallbackLlm = new ChatOpenAI({
  model: "meta/llama-3.1-8b-instruct",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: { baseURL: "https://integrate.api.nvidia.com/v1" },
  temperature: 0.2,
  maxTokens: 2048,
});

const llm = primaryLlm.withFallbacks({ fallbacks: [fallbackLlm] });

// ── Nodes ─────────────────────────────────────────────────────────────

// 1. Medical Safety Agent
async function medicalSafetyAgent(state: typeof GraphState.State) {
  const prompt = `Analyze the following query. Is it related to health, medicine, disease, symptoms, Siddha medicine, wellness, or general medical triage?
Query: ${state.input}
Respond with only YES or NO.`;
  
  const response = await llm.invoke(prompt);
  const content = response.content.toString().trim().toUpperCase();
  const isMedical = content.includes("YES");
  
  return { isMedical };
}

// 2. Advanced Hybrid Retrieval Agent
async function retrievalAgent(state: typeof GraphState.State) {
  if (!state.isMedical) return { retrievedDocs: [] };

  const { docs } = await hybridRetrieval(state.input, state.chatLogId);
  return { retrievedDocs: docs };
}

// 3. Cohere Reranking Agent with Diagnostics Logging
async function rerankingAgent(state: typeof GraphState.State) {
  if (!state.isMedical || state.retrievedDocs.length === 0) return { rerankedDocs: [] };

  try {
    if (process.env.COHERE_API_KEY) {
      const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
      const documents = state.retrievedDocs.map(d => ({ text: d.pageContent }));
      const reranked = await cohere.rerank({
        query: state.input,
        documents,
        model: "rerank-english-v3.0",
        topN: 5,
      });

      const topDocs = reranked.results.map(r => {
        const doc = state.retrievedDocs[r.index];
        doc.metadata.rerankScore = r.relevanceScore;
        return doc;
      });

      // Track Rerank diagnostics telemetry
      const rerankScores = reranked.results.map(r => r.relevanceScore);
      if (state.chatLogId && rerankScores.length > 0) {
        prisma.retrievalDiagnostic.updateMany({
          where: { chatLogId: state.chatLogId },
          data: {
            rerankScoreMin: Math.min(...rerankScores),
            rerankScoreMax: Math.max(...rerankScores),
          }
        }).catch(err => console.error("Failed to update reranking diagnostics:", err));
      }

      return { rerankedDocs: topDocs };
    }
  } catch (e) {
    console.warn("Cohere Reranking failed or key missing, falling back to top 5:", e);
  }
  
  // Fallback if no Cohere
  return { rerankedDocs: state.retrievedDocs.slice(0, 5) };
}

// 4. Answer Generator Agent
async function generatorAgent(state: typeof GraphState.State) {
  if (!state.isMedical) {
    return {
      generation: "I am a medical assistant. Please ask me questions related to health, symptoms, or Siddha medicine.",
      symptomsToAsk: [],
      needsDoctor: false
    };
  }

  const contextStr = state.rerankedDocs.map((d, i) => `[Source ${i + 1}]: ${d.pageContent}`).join("\n\n");
  
  const SYSTEM_PROMPT = `You are MedBot, an incredibly warm, knowledgeable, and friendly Medical Research Assistant. You speak Tanglish and English.
 
Always include a clear medical disclaimer saying: "Disclaimer: Siddha recommendations should be used under clinical supervision. Consult a registered Siddha practitioner (BSMS) for formal diagnosis."

## Structured Output
You must output a raw JSON object matching exactly this schema, without markdown formatting:
{{
  "diagnosis": "Explanation of condition",
  "symptoms": "Current symptoms and analysis",
  "siddha_medicine": "Medicine based STRICTLY on context below",
  "food_recommendation": "Dietary advice",
  "doctor_consultation": "Doctor advice",
  "symptoms_to_ask": ["Symptom 1", "Symptom 2"],
  "needs_doctor": true/false
}}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    ["human", `History: {history}\n\nContext:\n{context}\n\nQuery: {input}\nProvide JSON now.`]
  ]);

  const chain = prompt.pipe(llm).pipe(new StringOutputParser());
  const rawAnswer = await chain.invoke({ history: state.history, context: contextStr, input: state.input });

  let parsed;
  try {
    const clean = rawAnswer.replace(/^```json/i, "").replace(/```$/i, "").trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    parsed = { diagnosis: rawAnswer, symptoms: "", siddha_medicine: "", food_recommendation: "", doctor_consultation: "", symptoms_to_ask: [], needs_doctor: false };
  }

  let mdAnswer = "";
  if (parsed.diagnosis) mdAnswer += `**Diagnosis**\n${parsed.diagnosis}\n\n`;
  if (parsed.symptoms) mdAnswer += `**Symptoms**\n${parsed.symptoms}\n\n`;
  if (parsed.siddha_medicine) mdAnswer += `**Medicine in Siddha**\n${parsed.siddha_medicine}\n\n`;
  if (parsed.food_recommendation) mdAnswer += `**Food Recommendation**\n${parsed.food_recommendation}\n\n`;
  if (parsed.doctor_consultation) mdAnswer += `**Doctor Consultation**\n${parsed.doctor_consultation}\n\n`;

  if (!mdAnswer.trim()) mdAnswer = rawAnswer;

  return {
    generation: mdAnswer.trim(),
    symptomsToAsk: parsed.symptoms_to_ask || [],
    needsDoctor: parsed.needs_doctor || false
  };
}

// 5. Verification Agent
async function verificationAgent(state: typeof GraphState.State) {
  // Simple check for hallucinations if it's medical
  if (!state.isMedical || state.rerankedDocs.length === 0) return { verified: true };
  
  const verificationPrompt = `Does the following answer invent Siddha medicine that is not present in the context?
Context: ${state.rerankedDocs.map((d, i) => `[${i+1}]: ${d.pageContent}`).join("\n")}
Answer: ${state.generation}
Reply ONLY with SAFE or UNSAFE.`;
  
  const res = await llm.invoke(verificationPrompt);
  const isSafe = res.content.toString().includes("SAFE");
  
  if (!isSafe) {
    return { generation: "I apologize, but I could not verify the Siddha medicine recommendation against my trusted documents. Please consult a qualified practitioner.", verified: false };
  }
  return { verified: true };
}

// ── Graph Construction ────────────────────────────────────────────────
const workflow = new StateGraph(GraphState)
  .addNode("medicalSafety", medicalSafetyAgent)
  .addNode("retrieval", retrievalAgent)
  .addNode("reranking", rerankingAgent)
  .addNode("generator", generatorAgent)
  .addNode("verification", verificationAgent)

  .addEdge(START, "medicalSafety")
  .addConditionalEdges("medicalSafety", 
    (state) => state.isMedical ? "retrieval" : "generator",
    { "retrieval": "retrieval", "generator": "generator" }
  )
  .addEdge("retrieval", "reranking")
  .addEdge("reranking", "generator")
  .addEdge("generator", "verification")
  .addEdge("verification", END);
export const agentExecutor = workflow.compile();
