// ═══════════════════════════════════════
// MEDBOT LANDING — DATA CONSTANTS
// ═══════════════════════════════════════

export const NAV_LINKS = [
  { label: "Intelligence", href: "#intelligence" },
  { label: "Architecture", href: "#architecture" },
  { label: "Diagnostics", href: "#diagnostics" },
  { label: "Research", href: "#research" },
] as const;

export const TERMINAL_LINES: { text: string; color: "dim" | "gold" | "bright" }[] = [
  { text: '$ query --mode=hybrid --rerank=cohere', color: "dim" },
  { text: '> Initializing BM25 index scan...', color: "dim" },
  { text: '> Chroma DB vector match: 0.9972', color: "gold" },
  { text: '> RRF fusion complete. 10 candidates.', color: "dim" },
  { text: '> Cohere rerank score: 0.9845', color: "gold" },
  { text: '> Safety agent: PASS', color: "dim" },
  { text: '> RESULT: Tulsi (Ocimum tenuiflorum) exhibits', color: "bright" },
  { text: '  robust bronchial vasodilation. Kudineer', color: "bright" },
  { text: '  formulation recommended. Source: §4.2.1', color: "bright" },
  { text: '✦ Verification complete · 118ms · 0 hallucinations', color: "gold" },
];

export const METRICS = [
  {
    value: "< 120",
    suffix: "ms",
    label: "RAG LATENCY",
    description: "Hybrid query + Cohere rerank",
    numericTarget: 120,
  },
  {
    value: "100",
    suffix: "%",
    label: "VERIFICATION",
    description: "Zero hallucination guarantee",
    numericTarget: 100,
  },
  {
    value: "70",
    suffix: "B",
    label: "PARAMETERS",
    description: "NVIDIA Llama 3.3 Instruct",
    numericTarget: 70,
  },
  {
    value: "BullMQ",
    suffix: "",
    label: "QUEUE ENGINE",
    description: "Async ingestion architecture",
    numericTarget: null,
  },
] as const;

export const FEATURES = [
  {
    number: "01",
    tag: "INFERENCE",
    title: "Sovereign AI Synthesis",
    description:
      "Powered by top-tier models through high-throughput NVIDIA NIM microservices, ensuring blistering processing speed and unparalleled natural reasoning capabilities across massive clinical corpora.",
  },
  {
    number: "02",
    tag: "RETRIEVAL",
    title: "Hybrid Context Retrieval",
    description:
      "Uses a robust blend of keyword BM25 scanning and semantic Chroma DB vector distance search, combined via Reciprocal Rank Fusion — completely bypassing constraints of naive single-vector indexes.",
  },
  {
    number: "03",
    tag: "SECURITY",
    title: "Strict Verification Guardrails",
    description:
      "Autonomous, real-time citation analysis checks matching source indexes against final synthesis to guarantee all claims trace directly to safe, verified primary documents — zero hallucination tolerance.",
  },
] as const;

export const FAQS = [
  {
    q: "How does the Hybrid Retrieval system work?",
    a: "MedBot merges keyword-based BM25 searching with semantic Chroma DB vector retrieval. These multi-dimensional search indexes are combined using Reciprocal Rank Fusion (RRF), ensuring that both precise phrasing matches and high-level conceptual relationships are extracted simultaneously.",
  },
  {
    q: "What makes Cohere Reranking so effective?",
    a: "Raw semantic search queries often retrieve redundant or partially relevant text chunks. We push all retrieved candidates through a Cohere Rerank v3 pipeline. This ranks each snippet according to deep clinical relevance, shrinking the model's context window while elevating target accuracy.",
  },
  {
    q: "How are recommendations protected from hallucinations?",
    a: "We run a dual-guardrail system: First, a Medical Safety agent ensures incoming queries are clinically relevant. Second, the generated output is parsed and verified by a Verification Agent. If the output attempts to invent information not present in the raw indexed source documents, it is blocked.",
  },
  {
    q: "Can I query documents in Tamlish or Tanglish?",
    a: "Yes. MedBot is natively tuned to understand and respond in colloquial South-Asian dialects, including Tanglish (Tamil + English) and standard clinical English, making botanical medical literature accessible to local practitioners and researchers.",
  },
] as const;

export const TELEMETRY_LOGS = [
  "[14:23:01] Ingestion thread initialized on queue workers...",
  "[14:23:01] BM25 index scan complete: 847 terms indexed",
  "[14:23:02] Semantic vector matches queried on ChromaDB [status: success]",
  "[14:23:02] RRF applied over top 10 results. Rerank score: 0.9845",
  "[14:23:03] Verification check complete: SAFE. Hallucination rate: 0.00%",
  "[14:23:04] Response generated. Latency: 118ms. Tokens: 342",
  "[14:23:05] Session logged to Supabase. Trace ID: ls-4f8a2c",
  "[14:23:06] Worker #2 idle. Awaiting next ingestion job...",
] as const;

export const CITATION_CARDS = [
  {
    name: "Siddha_Materia_Medica.pdf",
    ref: "§4.2.1",
    score: 98,
    rank: 1,
  },
  {
    name: "Herbal_Pharmacopoeia.csv",
    ref: "Row 127",
    score: 91,
    rank: 2,
  },
  {
    name: "Tamil_Nadu_Clinical_Guidelines",
    ref: "Ch. 8, P. 14",
    score: 84,
    rank: 3,
  },
] as const;

export const PIPELINE_NODES = [
  { id: "guard", label: "QUERY GUARD", desc: "Safety filtering", active: false },
  { id: "retrieval", label: "HYBRID RETRIEVAL", desc: "BM25 + Vector", active: false },
  { id: "rerank", label: "RRF + RERANK", desc: "Cohere v3 fusion", active: true },
  { id: "synthesis", label: "LLM SYNTHESIS", desc: "Llama 3.3 70B", active: false },
  { id: "verify", label: "VERIFICATION", desc: "Hallucination check", active: false },
] as const;

// Shared easing
export const EXPO_OUT = [0.16, 1, 0.3, 1] as const;
