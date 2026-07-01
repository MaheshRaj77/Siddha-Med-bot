"use client";

import { useState, useRef, useEffect, useDeferredValue, useCallback, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, FileText, Loader2, Trash2, Sparkles, CheckCircle2, Shield, Activity, BarChart2, Clock, ChevronDown, ChevronUp, LogOut, Menu, X, Search, SquarePen, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Brain, Database, AlertTriangle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductBrand, ThemeToggle, useProductTheme } from "@/components/product/ProductTheme";

// ── Simple Markdown Renderer ───────────────────────────────────────────
function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType: "ul" | "ol" = "ul";

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === "ol") {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1.5 my-2 pl-1 text-sm">
            {listItems.map((item, i) => (
              <li key={i} className="text-neutral-200 leading-relaxed">
                <InlineMarkdown text={item} />
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2 pl-1 text-sm">
            {listItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-neutral-200 leading-relaxed">
                <span className="text-emerald-400 mt-1 shrink-0">•</span>
                <span><InlineMarkdown text={item} /></span>
              </li>
            ))}
          </ul>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (trimmed === "" || trimmed === "---") {
      flushList();
      if (trimmed === "---") {
        elements.push(<hr key={`hr-${i}`} className="border-white/10 my-3" />);
      }
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-bold text-emerald-300 mt-4 mb-1.5">
          <InlineMarkdown text={trimmed.slice(4)} />
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-emerald-300 mt-4 mb-1.5">
          <InlineMarkdown text={trimmed.slice(3)} />
        </h3>
      );
      continue;
    }

    // Bullet lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { inList = true; listType = "ul"; }
      listItems.push(trimmed.slice(2));
      continue;
    }

    // Numbered lists
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inList) { inList = true; listType = "ol"; }
      listItems.push(olMatch[1]);
      continue;
    }

    // Normal paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-neutral-200 leading-relaxed my-1.5 text-sm">
        <InlineMarkdown text={trimmed} />
      </p>
    );
  }

  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}

// ── Inline Markdown (bold, italic, code, emoji-aware) ──────────────────
function InlineMarkdown({ text }: { text: string }) {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
      codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    const before = remaining.slice(0, first.index);
    if (before) parts.push(before);

    if (first.type === "bold") {
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-white">
          {first.match![1]}
        </strong>
      );
    } else if (first.type === "italic") {
      parts.push(
        <em key={`i-${keyIdx++}`} className="italic text-neutral-300">
          {first.match![1]}
        </em>
      );
    } else if (first.type === "code") {
      parts.push(
        <code key={`c-${keyIdx++}`} className="bg-white/10 text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono">
          {first.match![1]}
        </code>
      );
    }

    remaining = remaining.slice(first.index + first.match![0].length);
  }

  return <>{parts}</>;
}

// ── Toast Notification Component ───────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${
        type === "success"
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
          : "bg-red-500/15 border-red-500/30 text-red-300"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-5 h-5 shrink-0" />
      ) : (
        <span className="text-lg">⚠️</span>
      )}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

// ── Interactive Clarification Reply ─────────────────────────────────────
function ClarificationReply({ questions, onSubmit }: { questions: string[], onSubmit: (details: string) => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const answeredCount = questions.filter((_, index) => answers[index]?.trim()).length;
  const canSubmit = answeredCount > 0;

  const updateAnswer = (index: number, value: string) => {
    setAnswers((current) => ({ ...current, [index]: value }));
  };

  const markUnsure = (index: number) => {
    updateAnswer(index, "Not sure");
  };

  const submitAnswers = () => {
    const formattedAnswers = questions
      .map((question, index) => {
        const answer = answers[index]?.trim() || "Not answered";
        return `${index + 1}. ${question}\nAnswer: ${answer}`;
      })
      .join("\n\n");

    setSubmitted(true);
    onSubmit(formattedAnswers);
  };

  if (submitted) {
    return <div className="mt-4 inline-block rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium italic text-emerald-400">Additional details submitted</div>;
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg">
      <p className="flex items-center gap-1.5 text-sm font-medium text-white">
        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
        Please answer these follow-up questions
      </p>
      <div className="space-y-3">
        {questions.map((question, index) => (
          <div key={`${question}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold leading-relaxed text-neutral-200">
                {index + 1}. {question}
              </span>
              <textarea
                value={answers[index] || ""}
                onChange={(event) => updateAnswer(index, event.target.value)}
                placeholder="Type your answer for this question"
                rows={2}
                className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs leading-relaxed text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-emerald-500/40"
              />
            </label>
            <button
              type="button"
              onClick={() => markUnsure(index)}
              className="mt-2 rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-neutral-400 transition hover:border-emerald-500/30 hover:text-emerald-300"
            >
              I am not sure
            </button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-neutral-500">
        Answer what you know. You can mark any question as not sure.
      </p>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={submitAnswers}
        className="mt-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-black shadow-md transition-all hover:from-emerald-600 hover:to-teal-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue with {answeredCount} answer{answeredCount === 1 ? "" : "s"}
      </button>
    </div>
  );
}

// ── Progressive Agent Steps Progress Logger ───────────────────────────
interface StepStates {
  medicalSafety: "pending" | "active" | "completed";
  clarification: "pending" | "active" | "completed";
  retrieval: "pending" | "active" | "completed";
  reranking: "pending" | "active" | "completed";
  generator: "pending" | "active" | "completed";
  verification: "pending" | "active" | "completed";
}

type StepConfig = {
  key: keyof StepStates;
  label: string;
  desc: string;
  detail: string;
  icon: JSX.Element;
};

const agentStepConfigs: StepConfig[] = [
  {
    key: "medicalSafety",
    label: "Medical Safety Triage",
    desc: "Checking whether this belongs in the medical/Siddha lane",
    detail: "Domain classifier",
    icon: <Shield className="h-3.5 w-3.5" />,
  },
  {
    key: "clarification",
    label: "Case Detail Check",
    desc: "Deciding if the question needs follow-up details first",
    detail: "Context sufficiency",
    icon: <MessageCircleIcon />,
  },
  {
    key: "retrieval",
    label: "Active Knowledge Retrieval",
    desc: "Searching active Postgres chunks with keyword, synonym, and vector signals",
    detail: "FTS + semantic recall",
    icon: <Database className="h-3.5 w-3.5" />,
  },
  {
    key: "reranking",
    label: "Evidence Ranking",
    desc: "Promoting the most relevant Siddha records and source rows",
    detail: "Top evidence selection",
    icon: <BarChart2 className="h-3.5 w-3.5" />,
  },
  {
    key: "generator",
    label: "Grounded Answer Draft",
    desc: "Writing only from retrieved active knowledge",
    detail: "Llama synthesis",
    icon: <Brain className="h-3.5 w-3.5" />,
  },
  {
    key: "verification",
    label: "Grounding Verification",
    desc: "Checking the answer for unsupported medical claims",
    detail: "Safety guardrail",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
];

function MessageCircleIcon() {
  return <Activity className="h-3.5 w-3.5" />;
}

function ProgressiveAgentLogger({ steps, elapsedMs }: { steps: StepStates; elapsedMs: number }) {
  const completedCount = agentStepConfigs.filter((item) => steps[item.key] === "completed").length;
  const activeStep = agentStepConfigs.find((item) => steps[item.key] === "active");
  const activeIndex = activeStep ? agentStepConfigs.findIndex((item) => item.key === activeStep.key) : completedCount;
  const progress = Math.min(
    96,
    Math.max(8, ((completedCount + (activeStep ? 0.55 : 0.12)) / agentStepConfigs.length) * 100)
  );

  return (
    <div className="my-4 mx-auto max-w-lg overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-md shadow-[var(--app-shadow)] backdrop-blur-xl p-3 flex items-center gap-3.5 transition-all duration-300">
      {/* Dynamic Pulsing Circle Loader */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-soft)] text-[#0B8B73]">
        <motion.span
          className="absolute inset-0 rounded-xl bg-emerald-500/10 blur-[2px]"
          animate={{ scale: [0.95, 1.15, 0.95], opacity: [0.5, 0.9, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        <Loader2 className="h-5 w-5 animate-spin text-[#0B8B73] relative" />
      </div>

      {/* Primary and secondary status detail */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-bold text-[var(--app-text)] leading-none truncate">
            {activeStep ? activeStep.label : "Initializing..."}
          </p>
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[var(--app-soft)] text-[#0B8B73] leading-none shrink-0 uppercase tracking-wider">
            Stage {activeIndex + 1}/6
          </span>
        </div>
        <p className="text-[11px] text-[var(--app-muted)] mt-1.5 truncate leading-none">
          {activeStep ? activeStep.desc : "Preparing active knowledge channels"}
        </p>
      </div>

      {/* Elapsed time & mini progress bar */}
      <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--app-muted)]">
          <Clock className="h-3.5 w-3.5 text-emerald-500" />
          <span>{formatAgentElapsed(elapsedMs)}</span>
        </div>
        <div className="w-14 h-1 rounded-full bg-[var(--app-soft)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#0B8B73]"
          />
        </div>
      </div>
    </div>
  );
}

function formatAgentElapsed(elapsedMs: number) {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// ── Enterprise Retrieval Diagnostics Panel ────────────────────────────
type DiagnosticsData = {
  latencyMs?: number | null;
  rrfScoreMax?: number | null;
  rrfScoreMin?: number | null;
  rerankScoreMax?: number | null;
  rerankScoreMin?: number | null;
  redundancyRatio?: number | null;
  query?: string;
  rewrittenQuery?: string;
};

type SourceRef = {
  file: string;
  page?: string | number;
  text: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  kind?: "normal" | "quota";
  upgradeUrl?: string;
  sources?: SourceRef[];
  symptoms_to_ask?: string[];
  needs_doctor?: boolean;
  diagnostics?: DiagnosticsData | null;
};

type ChatSession = {
  id: string;
  title: string;
};

type UserProfile = {
  user: {
    name?: string | null;
    email: string;
    role: "USER" | "ADMIN" | "SUPER_ADMIN" | string;
    planSlug?: string;
    planName?: string;
  };
  quota: {
    monthlyTokenLimit: number;
  };
  tokens?: {
    monthlyTokenLimit: number;
    monthlyTokenAdjustment: number;
    monthlyTokensUsed: number;
    monthlyTokensRemaining: number;
  };
  usage: {
    monthlyTokensUsed: number;
  };
};

type AgentSettings = {
  agentName: string;
  agentSubtitle: string;
  profileImageUrl: string;
  welcomeMessage: string;
  inputPlaceholder: string;
  disclaimer: string;
};

const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  agentName: "Siddha MedBot",
  agentSubtitle: "Medical Research Assistant",
  profileImageUrl: "/bot-profile.png",
  welcomeMessage:
    "Hey there! I'm **Siddha MedBot**, your Medical Research Assistant.\n\nI can help you explore and understand the curated resources in the Knowledge Base. You can ask me anything about Siddha medicine, treatments, and clinical studies covered by those sources.\n\n*Tip: Neenga Tanglish-la kooda kelvi kekalam! I understand and speak Tanglish fluently.*\n\nWhat would you like to explore today?",
  inputPlaceholder: "Ask anything about Siddha medicine",
  disclaimer:
    "AI can make mistakes. Please verify important medical information with a qualified practitioner.",
};

function normalizeAgentSettings(settings: Partial<AgentSettings> | null | undefined): AgentSettings {
  return {
    agentName: settings?.agentName || DEFAULT_AGENT_SETTINGS.agentName,
    agentSubtitle: settings?.agentSubtitle || DEFAULT_AGENT_SETTINGS.agentSubtitle,
    profileImageUrl: settings?.profileImageUrl || DEFAULT_AGENT_SETTINGS.profileImageUrl,
    welcomeMessage: settings?.welcomeMessage || DEFAULT_AGENT_SETTINGS.welcomeMessage,
    inputPlaceholder: settings?.inputPlaceholder || DEFAULT_AGENT_SETTINGS.inputPlaceholder,
    disclaimer: settings?.disclaimer || DEFAULT_AGENT_SETTINGS.disclaimer,
  };
}

function DiagnosticsInspector({ diagnostics }: { diagnostics: DiagnosticsData }) {
  const [open, setOpen] = useState(false);
  if (!diagnostics) return null;

  return (
    <div className="mt-3 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all">
      <button 
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:bg-white/5 transition-all select-none"
      >
        <span className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          ENTERPRISE RETRIEVAL DIAGNOSTICS & TELEMETRY
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
      </button>

      {open && (
        <div className="p-4 border-t border-white/5 bg-black/40 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 border border-white/5 rounded-lg p-3">
              <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Latency
              </div>
              <p className="text-lg font-bold text-white mt-1">{diagnostics.latencyMs || 0} <span className="text-xs text-neutral-400 font-normal">ms</span></p>
            </div>
            
            <div className="bg-white/5 border border-white/5 rounded-lg p-3">
              <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                RRF Scores
              </div>
              <p className="text-sm font-bold text-white mt-1">
                {diagnostics.rrfScoreMax ? diagnostics.rrfScoreMax.toFixed(4) : "0.0000"}
                <span className="block text-[10px] text-neutral-500 font-medium font-mono">Min: {diagnostics.rrfScoreMin ? diagnostics.rrfScoreMin.toFixed(4) : "0.0000"}</span>
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-lg p-3">
              <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Cohere Rerank
              </div>
              <p className="text-sm font-bold text-white mt-1">
                {diagnostics.rerankScoreMax ? diagnostics.rerankScoreMax.toFixed(4) : "0.0000"}
                <span className="block text-[10px] text-neutral-500 font-medium font-mono">Min: {diagnostics.rerankScoreMin ? diagnostics.rerankScoreMin.toFixed(4) : "0.0000"}</span>
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-lg p-3">
              <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Redundancy
              </div>
              <p className="text-lg font-bold text-white mt-1">
                {diagnostics.redundancyRatio ? `${(diagnostics.redundancyRatio * 100).toFixed(1)}%` : "0.0%"}
              </p>
            </div>
          </div>

          <div className="bg-black/60 rounded-lg border border-white/5 p-3.5 space-y-2">
            <h4 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Query Translation & Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-neutral-500 font-medium">Original Query:</span>
                <span className="text-neutral-300 italic">&quot;{diagnostics.query}&quot;</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-neutral-500 font-medium">Rewritten Search Query:</span>
                <span className="text-neutral-300 font-semibold text-emerald-400">&quot;{diagnostics.rewrittenQuery}&quot;</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Structured Medical Report Component ─────────────────────────────────
type StructuredReport = {
  answer?: string;
  diagnosis?: string;
  symptoms?: string;
  siddha_medicine?: string;
  food_recommendation?: string;
  doctor_consultation?: string;
};

function StructuredMedicalReport({ text }: { text: string }) {
  let parsed: StructuredReport | null = null;

  // 1. Try parsing JSON first
  try {
    let clean = text.replace(/^```json/i, "").replace(/```$/i, "").trim();
    const startIdx = clean.indexOf("{");
    const endIdx = clean.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      clean = clean.substring(startIdx, endIdx + 1);
    }
    parsed = JSON.parse(clean) as StructuredReport;
  } catch {
    parsed = null;
  }

  // New responses are intentionally rendered as one concise answer.
  if (parsed?.answer) {
    return <RenderMarkdown text={parsed.answer} />;
  }

  // 2. If not valid JSON, check if it's the structured markdown fallback format
  if (!parsed && text.includes("**Diagnosis**")) {
    parsed = {};
    const diagnosisMatch = text.match(/\*\*Diagnosis\*\*\n([\s\S]*?)(?=\n\*\*|$)/i);
    const symptomsMatch = text.match(/\*\*Symptoms\*\*\n([\s\S]*?)(?=\n\*\*|$)/i);
    const medicineMatch = text.match(/\*\*(?:Medicine in Siddha|Siddha Medicine)\*\*\n([\s\S]*?)(?=\n\*\*|$)/i);
    const foodMatch = text.match(/\*\*Food Recommendation\*\*\n([\s\S]*?)(?=\n\*\*|$)/i);
    const doctorMatch = text.match(/\*\*Doctor Consultation\*\*\n([\s\S]*?)(?=\n\*\*|$)/i);

    if (diagnosisMatch) parsed.diagnosis = diagnosisMatch[1].trim();
    if (symptomsMatch) parsed.symptoms = symptomsMatch[1].trim();
    if (medicineMatch) parsed.siddha_medicine = medicineMatch[1].trim();
    if (foodMatch) parsed.food_recommendation = foodMatch[1].trim();
    if (doctorMatch) parsed.doctor_consultation = doctorMatch[1].trim();
  }

  // 3. Fallback to normal RenderMarkdown if it's a general text or cannot be structured
  if (!parsed || (!parsed.diagnosis && !parsed.siddha_medicine && !parsed.symptoms)) {
    return <RenderMarkdown text={text} />;
  }

  const unifiedAnswer = [
    parsed.diagnosis,
    parsed.symptoms,
    parsed.siddha_medicine,
    parsed.food_recommendation,
    parsed.doctor_consultation,
  ].filter(Boolean).join("\n\n");

  return <RenderMarkdown text={unifiedAnswer} />;
}

function formatLimit(value: number) {
  return value >= 999999 ? "Unlimited" : value.toLocaleString("en-IN");
}

function usagePercent(count: number, limit: number) {
  if (limit >= 999999) return 0;
  return Math.min(100, Math.round((count / Math.max(limit, 1)) * 100));
}

function UsageCounter({ profile }: { profile: UserProfile }) {
  const tokens = profile.tokens || {
    monthlyTokenLimit: profile.quota.monthlyTokenLimit,
    monthlyTokenAdjustment: 0,
    monthlyTokensUsed: profile.usage.monthlyTokensUsed,
    monthlyTokensRemaining: Math.max(0, profile.quota.monthlyTokenLimit - profile.usage.monthlyTokensUsed),
  };
  const monthlyPercent = usagePercent(tokens.monthlyTokensUsed, tokens.monthlyTokenLimit);

  return (
    <div className="hidden min-w-[188px] rounded-xl border border-[var(--app-border)] bg-[var(--app-soft)] px-3 py-2 sm:block">
      <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-faint)]">
        <span>{profile.user.planName || "Current Plan"}</span>
        <span>{formatLimit(tokens.monthlyTokensRemaining)} left</span>
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-border)]">
          <div className="h-full rounded-full bg-[#0B8B73]" style={{ width: `${monthlyPercent}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-[var(--app-muted)]">
          <span>{tokens.monthlyTokensUsed.toLocaleString("en-IN")} tokens used</span>
          <span>{formatLimit(tokens.monthlyTokenLimit)} limit</span>
        </div>
      </div>
      {monthlyPercent >= 80 && tokens.monthlyTokenLimit < 999_999_999 && (
        <p className="mt-1 text-[10px] font-medium text-amber-500">{monthlyPercent}% of monthly tokens used</p>
      )}
    </div>
  );
}

function QuotaUpgradeMessage({ message, upgradeUrl }: { message: string; upgradeUrl?: string }) {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-[var(--app-text)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-500">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--app-text)]">Monthly tokens exhausted</p>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">{message}</p>
          <Link
            href={upgradeUrl || "/#pricing"}
            className="mt-3 inline-flex items-center rounded-lg bg-[#0B8B73] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#087760]"
          >
            View upgrade plans
          </Link>
        </div>
      </div>
    </div>
  );
}

function generateUUID() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { theme, setTheme } = useProductTheme();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string>(() => generateUUID());
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const deferredSessionSearch = useDeferredValue(sessionSearch);
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: DEFAULT_AGENT_SETTINGS.welcomeMessage }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentStartedAt, setAgentStartedAt] = useState<number | null>(null);
  const [agentElapsedMs, setAgentElapsedMs] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [agentSteps, setAgentSteps] = useState<StepStates>({
    medicalSafety: "pending",
    clarification: "pending",
    retrieval: "pending",
    reranking: "pending",
    generator: "pending",
    verification: "pending",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visibleSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(deferredSessionSearch.trim().toLowerCase())
  );
  const currentTokens = userProfile?.tokens || (userProfile ? {
    monthlyTokenLimit: userProfile.quota.monthlyTokenLimit,
    monthlyTokenAdjustment: 0,
    monthlyTokensUsed: userProfile.usage.monthlyTokensUsed,
    monthlyTokensRemaining: Math.max(0, userProfile.quota.monthlyTokenLimit - userProfile.usage.monthlyTokensUsed),
  } : null);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || "Unable to verify your session. Please refresh once.", type: "error" });
        return;
      }
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserProfile(data as UserProfile);
    } catch {
      setToast({ message: "Unable to verify your session. Please refresh once.", type: "error" });
    }
  };

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await fetch("/api/chat/sessions");
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchAgentSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/agent-settings");
      const data = await res.json();
      if (!res.ok || !data.settings) return;

      const nextSettings = normalizeAgentSettings(data.settings);
      setAgentSettings(nextSettings);
      setMessages((current) => (
        current.length === 1
        && current[0].role === "assistant"
        && current[0].content === DEFAULT_AGENT_SETTINGS.welcomeMessage
          ? [{ role: "assistant", content: nextSettings.welcomeMessage }]
          : current
      ));
    } catch (error) {
      console.error("Failed to fetch agent settings:", error);
    }
  }, []);

  const handleNewChat = () => {
    if (loading) return;
    setActiveSessionId(generateUUID());
    setMessages([
      { 
        role: "assistant", 
        content: agentSettings.welcomeMessage
      }
    ]);
    if (!isDesktop) setSidebarOpen(false);
  };

  const handleSelectSession = async (id: string) => {
    if (loading || activeSessionId === id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/sessions/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.messages || []);
        setActiveSessionId(id);
        if (!isDesktop) setSidebarOpen(false);
      } else {
        showToast(data.error || "Failed to load chat history", "error");
      }
    } catch (e) {
      console.error("Failed to load session:", e);
      showToast("Error loading chat history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessionToDelete(id);
  };

  const performDeleteSession = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/sessions?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Conversation deleted", "success");
        fetchSessions();
        if (activeSessionId === id) {
          handleNewChat();
        }
      } else {
        showToast(data.error || "Failed to delete conversation", "error");
      }
    } catch (err) {
      console.error("Error deleting session:", err);
      showToast("Error deleting conversation", "error");
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      void fetchAgentSettings();
      try {
        const profileRes = await fetch("/api/auth/me");
        const profileData = await profileRes.json();
        if (!profileRes.ok) {
          setToast({ message: profileData.error || "Unable to verify your session. Please refresh once.", type: "error" });
          return;
        }
        if (!profileData.user) {
          router.push("/login");
          return;
        }
        setUserProfile(profileData as UserProfile);
    } catch {
      setToast({ message: "Unable to verify your session. Please refresh once.", type: "error" });
    }

      try {
        setSessionsLoading(true);
        const sessionsRes = await fetch("/api/chat/sessions");
        const sessionsData = await sessionsRes.json();
        if (sessionsRes.ok && sessionsData.success) {
          setSessions(sessionsData.sessions || []);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setSessionsLoading(false);
      }
    };

    void loadInitialData();
  }, [router, fetchAgentSettings]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const syncSidebarState = (matches: boolean) => {
      setIsDesktop(matches);
      setSidebarOpen(matches);
    };

    syncSidebarState(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncSidebarState(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading || !agentStartedAt) return;

    const interval = setInterval(() => {
      setAgentElapsedMs((current) => current + 500);
    }, 500);

    return () => clearInterval(interval);
  }, [loading, agentStartedAt]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const handleSend = async (e?: React.FormEvent, customInput?: string, clarificationAnswered = false, originalQuery?: string) => {
    if (e) e.preventDefault();
    const textToSend = customInput || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: "user" as const, content: textToSend };

    setMessages(prev => [...prev, userMessage]);
    if (!customInput) setInput("");
    setLoading(true);
    setAgentStartedAt(1);
    setAgentElapsedMs(0);

    // Initialize agent logger tracking
    setAgentSteps({
      medicalSafety: "pending",
      clarification: "pending",
      retrieval: "pending",
      reranking: "pending",
      generator: "pending",
      verification: "pending",
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSend, originalQuery, sessionId: activeSessionId, clarificationAnswered }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          const creditMessage = errorData.error || "Your monthly tokens have ended for this plan.";
          setMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content: creditMessage,
              kind: "quota",
              upgradeUrl: typeof errorData.upgradeUrl === "string" ? errorData.upgradeUrl : "/#pricing",
            },
          ]);
          showToast("Your current plan tokens are finished.", "error");
          return;
        }
        throw new Error(errorData.error || "Failed to fetch response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response reader found");

      const initialAssistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        sources: [],
        symptoms_to_ask: [],
        needs_doctor: false,
        diagnostics: null,
      };

      setMessages(prev => [...prev, initialAssistantMessage]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          
          const eventMatch = line.match(/^event:\s*(.+)$/m);
          const dataMatch = line.match(/^data:\s*(.+)$/m);
          
          if (!eventMatch || !dataMatch) continue;
          
          const event = eventMatch[1].trim();
          const rawData = dataMatch[1].trim();
          let data: {
            node?: keyof StepStates;
            token?: string;
            answer?: string;
            sources?: SourceRef[];
            symptoms_to_ask?: string[];
            needs_doctor?: boolean;
            message?: string;
          };
          try {
            data = JSON.parse(rawData);
          } catch (e) {
            console.error("Failed to parse data payload:", rawData, e);
            continue;
          }

          if (event === "node_start") {
            if (data.node) {
              setAgentSteps(prev => ({
                ...prev,
                [data.node as string]: "active"
              }));
            }
          } else if (event === "node_end") {
            if (data.node) {
              setAgentSteps(prev => ({
                ...prev,
                [data.node as string]: "completed"
              }));
            }
          } else if (event === "token") {
            setMessages(prev => {
              const copy = [...prev];
              const lastMessage = copy[copy.length - 1];
              copy[copy.length - 1] = {
                ...lastMessage,
                role: "assistant",
                content: `${lastMessage?.content || ""}${data.token || ""}`,
              };
              return copy;
            });
          } else if (event === "diagnostics") {
            setMessages(prev => {
              const copy = [...prev];
              const lastMessage = copy[copy.length - 1];
              copy[copy.length - 1] = {
                ...lastMessage,
                role: "assistant",
                diagnostics: data as DiagnosticsData,
              };
              return copy;
            });
          } else if (event === "done") {
            setMessages(prev => {
              const copy = [...prev];
              const lastMessage = copy[copy.length - 1];
              copy[copy.length - 1] = {
                ...lastMessage,
                role: "assistant",
                content: data.answer || "",
                sources: data.sources || [],
                symptoms_to_ask: data.symptoms_to_ask || [],
                needs_doctor: data.needs_doctor || false,
              };
              return copy;
            });
          } else if (event === "error") {
            throw new Error(data.message || "Unknown error");
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setMessages(prev => {
        const next = [...prev];
        const lastMessage = next[next.length - 1];

        if (lastMessage?.role === "assistant" && !lastMessage.content && !lastMessage.sources?.length) {
          next.pop();
        }

        return [
          ...next,
          { role: "assistant", content: `Something went wrong while processing your question.\n\nError: ${message}\n\nPlease try again, or check whether documents are available for this answer.` }
        ];
      });
    } finally {
      setLoading(false);
      setAgentStartedAt(null);
      fetchUserProfile();
      fetchSessions();
    }
  };

  const handleClearChat = () => {
    setMessages([{ 
      role: "assistant", 
      content: "Chat cleared.\n\nThe curated knowledge resources are still available, so you can ask a new question anytime." 
    }]);
    if (!isDesktop) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/login", { method: "DELETE" });
      if (res.ok) {
        if (!isDesktop) setSidebarOpen(false);
        router.replace("/login");
        router.refresh();
      } else {
        showToast("Failed to log out", "error");
      }
    } catch {
      showToast("An error occurred during logout", "error");
    }
  };

  return (
    <div
      data-theme={theme}
      className="chatgpt-shell product-theme relative flex h-[100dvh] overflow-hidden bg-[var(--app-bg)] font-sans text-[var(--app-text)]"
    >
      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            type="button"
            aria-label="Close chat history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(19rem,88vw)] translate-x-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)] px-2.5 py-2.5 shadow-[0_24px_80px_var(--app-shadow)] transition-[width] duration-200 md:static md:z-10 md:translate-x-0 md:shadow-none ${
          sidebarCollapsed ? "md:w-[64px]" : "md:w-[276px]"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-1.5 py-1">
          <div className={sidebarCollapsed ? "md:hidden" : ""}>
            <ProductBrand compact />
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-soft)] hover:text-[var(--app-text)] md:inline-flex ${
              sidebarCollapsed ? "mx-auto" : ""
            }`}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-soft)] md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-1">
          <button
            onClick={handleNewChat}
            className={`flex w-full items-center rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-[var(--app-text)] transition hover:bg-[var(--app-soft)] ${
              sidebarCollapsed ? "md:justify-center md:px-0" : "gap-2.5"
            }`}
            title={sidebarCollapsed ? "New chat" : undefined}
          >
            <SquarePen className="h-4 w-4 text-[var(--app-muted)]" />
            <span className={sidebarCollapsed ? "md:hidden" : ""}>New chat</span>
          </button>
          <label className={`relative block ${sidebarCollapsed ? "md:hidden" : ""}`}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-faint)]" />
            <input
              value={sessionSearch}
              onChange={(event) => setSessionSearch(event.target.value)}
              placeholder="Search chats"
              className="w-full rounded-lg bg-transparent py-2.5 pl-9 pr-3 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-faint)] hover:bg-[var(--app-soft)] focus:bg-[var(--app-soft)]"
            />
          </label>
        </div>

        <div className={`custom-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto px-1 ${sidebarCollapsed ? "md:hidden" : ""}`}>
          <div className="flex items-center justify-between px-1.5 pb-2 pt-1">
            <span className="text-[11px] font-semibold text-[var(--app-faint)]">Chats</span>
            {sessionsLoading && <Loader2 className="h-3 w-3 animate-spin text-[#0B8B73]" />}
          </div>

          {visibleSessions.length === 0 ? (
            <div className="rounded-lg px-2 py-3 text-xs leading-5 text-[var(--app-faint)]">
              {sessions.length === 0 ? "Your conversations will appear here." : "No matching chats found."}
            </div>
          ) : (
            <div className="space-y-0.5">
              {visibleSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left transition ${
                    activeSessionId === session.id
                      ? "bg-[var(--app-soft)] text-[var(--app-text)]"
                      : "text-[var(--app-muted)] hover:bg-[var(--app-soft)] hover:text-[var(--app-text)]"
                  }`}
                >
                  <span className="truncate text-[13px] font-medium">{session.title}</span>
                  <button
                    onClick={(event) => handleDeleteSession(event, session.id)}
                    className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--app-faint)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--app-raised)] hover:text-red-400"
                    aria-label={`Delete ${session.title}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {userProfile?.user && (
          <details className="group/account relative mt-2 border-t border-[var(--app-border)] pt-2">
            <summary className={`flex cursor-pointer list-none items-center rounded-lg px-2 py-2 transition hover:bg-[var(--app-soft)] [&::-webkit-details-marker]:hidden ${
              sidebarCollapsed ? "md:justify-center md:px-0" : "gap-2.5"
            }`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#12C48B] to-[#0B8B73] text-xs font-bold text-white">
                {userProfile.user.name ? userProfile.user.name[0].toUpperCase() : userProfile.user.email[0].toUpperCase()}
              </span>
              <span className={`min-w-0 flex-1 ${sidebarCollapsed ? "md:hidden" : ""}`}>
                <span className="block truncate text-sm font-medium text-[var(--app-text)]">
                  {userProfile.user.name || "Siddha Researcher"}
                </span>
                <span className="block truncate text-[10px] text-[var(--app-faint)]">
                  {userProfile.user.email}
                </span>
              </span>
              <MoreHorizontal className={`h-4 w-4 shrink-0 text-[var(--app-faint)] ${sidebarCollapsed ? "md:hidden" : ""}`} />
            </summary>

            <div className={`absolute bottom-[calc(100%+0.5rem)] z-50 w-[244px] space-y-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-raised)] p-1.5 shadow-[0_16px_42px_var(--app-shadow)] ${
              sidebarCollapsed ? "left-0 md:left-[calc(100%+0.5rem)] md:bottom-0" : "left-0"
            }`}>
              <div className="px-2 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--app-faint)]">
                  {userProfile.user.role === "SUPER_ADMIN" ? "Super Admin" : userProfile.user.role === "ADMIN" ? "Doctor / Admin" : "Researcher"}
                </p>
                <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--app-muted)]">
                  <span>Monthly tokens</span>
                  <span className="font-semibold text-[var(--app-text)]">
                    {currentTokens?.monthlyTokenLimit === 999_999_999 ? "Unlimited" : `${currentTokens?.monthlyTokensRemaining.toLocaleString("en-IN") ?? 0} left`}
                  </span>
                </div>
              </div>

              {(userProfile.user.role === "ADMIN" || userProfile.user.role === "SUPER_ADMIN") && (
                <Link
                  href={userProfile.user.role === "SUPER_ADMIN" ? "/super-admin" : "/admin"}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-soft)] hover:text-[var(--app-text)]"
                >
                  <Shield className="h-3.5 w-3.5" />
                  {userProfile.user.role === "SUPER_ADMIN" ? "Super admin console" : "Admin dashboard"}
                </Link>
              )}
              <button onClick={handleClearChat} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-soft)] hover:text-[var(--app-text)]">
                <Trash2 className="h-3.5 w-3.5" />
                Clear current chat
              </button>
              <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-[var(--app-muted)] transition hover:bg-red-500/10 hover:text-red-400">
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </details>
        )}
      </motion.aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--app-bg)]">
        <header className="sticky top-0 z-20 bg-[var(--app-panel)] px-3 py-2 sm:px-4">
          <div className="flex w-full items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--app-text)] transition hover:bg-[var(--app-soft)] md:hidden"
              aria-label="Open chat history"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-[var(--app-text)] sm:text-base">
                {agentSettings.agentName} <span className="ml-1 text-xs text-[var(--app-faint)]">⌄</span>
              </h2>
              <p className="truncate text-[10px] text-[var(--app-faint)]">{agentSettings.agentSubtitle}</p>
            </div>

            {userProfile && <UsageCounter profile={userProfile} />}

            <ThemeToggle theme={theme} onChange={setTheme} />

            <button
              onClick={handleNewChat}
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-soft)] sm:inline-flex"
            >
              <Sparkles className="h-4 w-4 text-[#0B8B73]" />
              New chat
            </button>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 pb-28 pt-3 sm:gap-8 sm:pb-32">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="relative mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[var(--app-border)] bg-[#0B8B73]">
                      <Image
                        src={agentSettings.profileImageUrl}
                        alt={`${agentSettings.agentName} profile`}
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div
                    className={`flex min-w-0 flex-col gap-1.5 ${
                      msg.role === "user" ? "items-end" : "items-start"
                    } ${msg.role === "user" ? "max-w-[85%]" : "max-w-[calc(100%-2.5rem)] flex-1"}`}
                  >
                    <div
                      className={`chat-rich text-sm leading-7 ${
                        msg.role === "user"
                          ? "rounded-[22px] bg-[var(--chat-user)] px-4 py-2.5 text-[var(--app-text)]"
                          : "w-full px-0 py-0 text-[var(--app-text)]"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed sm:text-sm">{msg.content}</p>
                      ) : (
                        <div className="w-full text-sm">
                          {loading && agentStartedAt && idx === messages.length - 1 && (
                            <ProgressiveAgentLogger steps={agentSteps} elapsedMs={agentElapsedMs} />
                          )}

                          {msg.kind === "quota" ? (
                            <QuotaUpgradeMessage message={msg.content} upgradeUrl={msg.upgradeUrl} />
                          ) : (
                            <StructuredMedicalReport text={msg.content} />
                          )}

                          {msg.diagnostics && userProfile?.user?.role === "SUPER_ADMIN" && <DiagnosticsInspector diagnostics={msg.diagnostics} />}

                          {msg.symptoms_to_ask && msg.symptoms_to_ask.length > 0 && idx === messages.length - 1 && (
                            <ClarificationReply
                              questions={msg.symptoms_to_ask}
                              onSubmit={(details) => {
                                const originalQuestion = messages
                                  .slice(0, idx)
                                  .reverse()
                                  .find((message) => message.role === "user")?.content;
                                handleSend(undefined, details, true, originalQuestion);
                              }}
                              key={`clarification-${idx}`}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <details className="mt-2 w-full group">
                        <summary className="flex cursor-pointer select-none items-center gap-2 text-xs font-bold text-emerald-400/80 transition-colors hover:text-emerald-400">
                          <FileText className="h-3.5 w-3.5" />
                          {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""} referenced
                          <span className="text-[var(--app-faint)] transition-transform group-open:rotate-180">▼</span>
                        </summary>
                        <div className="mt-3 space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-glass)] p-4 shadow-inner">
                          {msg.sources.map((src: SourceRef, i: number) => (
                            <div
                              key={i}
                              className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-3 text-xs text-[var(--app-muted)] transition-all hover:bg-[var(--app-soft)]"
                            >
                              <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--app-text)]">
                                <span className="font-bold text-emerald-400">#{i + 1}</span>
                                {src.file} {src.page !== "?" ? `(Page ${src.page})` : ""}
                              </div>
                              <p className="line-clamp-3 font-serif leading-relaxed text-[var(--app-muted)]">{src.text}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--app-bg)] via-[var(--app-bg)] to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-12 sm:px-6">
          <form onSubmit={handleSend} className="pointer-events-auto relative mx-auto w-full max-w-3xl">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={agentSettings.inputPlaceholder}
              rows={1}
              className="min-h-[3.5rem] w-full resize-none rounded-[26px] border border-[var(--app-border)] bg-[var(--chat-composer)] py-4 pl-5 pr-14 text-[15px] text-[var(--app-text)] shadow-[0_6px_22px_var(--app-shadow)] outline-none transition-all placeholder:text-[var(--app-faint)] focus:border-[var(--app-muted)]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[var(--app-text)] p-2 text-[var(--app-bg)] transition-all active:scale-95 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-[var(--app-faint)] sm:text-[11px]">
            {agentSettings.disclaimer}
          </p>
        </div>
      </main>

      {/* Delete Consultation Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-raised)] p-6 text-center text-[var(--app-text)] shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[var(--app-text)]">Delete Consultation?</h3>
                <p className="text-xs text-[var(--app-muted)]">
                  This action will permanently delete all records of this consultation and cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-glass)] py-2 text-xs font-semibold text-[var(--app-muted)] transition-colors hover:bg-[var(--app-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    performDeleteSession(sessionToDelete);
                    setSessionToDelete(null);
                  }}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
