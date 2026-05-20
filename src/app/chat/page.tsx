"use client";

import { useState, useRef, useEffect, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, UploadCloud, Link as LinkIcon, FileText, Loader2, Bot, User, Trash2, Sparkles, CheckCircle2, Shield, Activity, BarChart2, Check, Clock, ChevronDown, ChevronUp, Database, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

// ── Interactive Symptom Checklist ────────────────────────────────────────
function SymptomChecklist({ symptoms, onSymptomSubmit }: { symptoms: string[], onSymptomSubmit: (selected: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggle = (s: string) => {
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  if (submitted) {
    return <div className="mt-4 text-sm text-emerald-400 italic bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20 inline-block font-medium">Follow-up symptoms submitted ✅</div>;
  }

  return (
    <div className="mt-4 space-y-3 bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
      <p className="text-sm font-medium text-white flex items-center gap-1.5">
        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
        Do you have any of these additional symptoms?
      </p>
      <div className="flex flex-wrap gap-2">
        {symptoms.map(s => (
          <label key={s} className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-all select-none">
            <input type="checkbox" className="accent-emerald-500 w-4 h-4 rounded" checked={selected.includes(s)} onChange={() => toggle(s)} />
            <span className="text-xs text-neutral-200">{s}</span>
          </label>
        ))}
        <label className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-all select-none">
          <input type="checkbox" className="accent-emerald-500 w-4 h-4 rounded" checked={selected.includes("None of the above")} onChange={() => setSelected(["None of the above"])} />
          <span className="text-xs text-neutral-200">None of the above</span>
        </label>
      </div>
      <button 
        onClick={() => { setSubmitted(true); onSymptomSubmit(selected.length > 0 ? selected : ["None"]); }}
        className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-black text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md active:scale-95"
      >
        Submit Answers
      </button>
    </div>
  );
}

// ── Progressive Agent Steps Progress Logger ───────────────────────────
interface StepStates {
  medicalSafety: "pending" | "active" | "completed";
  retrieval: "pending" | "active" | "completed";
  reranking: "pending" | "active" | "completed";
  generator: "pending" | "active" | "completed";
  verification: "pending" | "active" | "completed";
}

function ProgressiveAgentLogger({ steps }: { steps: StepStates }) {
  const stepsConfig = [
    { key: "medicalSafety", label: "Medical Safety Triage Check", desc: "Verifying health relevance & domain boundaries" },
    { key: "retrieval", label: "Hybrid Information Retrieval", desc: "BM25 Keyword + Semantic Vector store querying" },
    { key: "reranking", label: "Cohere Context Reranking", desc: "Selecting top most relevant documents & sorting" },
    { key: "generator", label: "Medical Response Synthesis", desc: "Synthesizing answer using NVIDIA Llama-3.3-70B" },
    { key: "verification", label: "Guardrails & Hallucination Check", desc: "Cross-checking generated recommendations with literature" },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 my-4 space-y-3.5 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <Activity className="w-4 h-4 text-emerald-400 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">Active RAG Engine Execution</span>
      </div>
      <div className="space-y-3">
        {stepsConfig.map((item) => {
          const status = steps[item.key as keyof StepStates] || "pending";
          return (
            <div key={item.key} className="flex items-start gap-3">
              <div className="mt-1 shrink-0">
                {status === "completed" && (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                )}
                {status === "active" && (
                  <div className="w-4 h-4 rounded-full border border-emerald-400 flex items-center justify-center relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                )}
                {status === "pending" && (
                  <div className="w-4 h-4 rounded-full border border-white/15 bg-white/5" />
                )}
              </div>
              <div>
                <p className={`text-xs font-semibold ${status === "active" ? "text-emerald-400" : status === "completed" ? "text-neutral-200" : "text-neutral-500"}`}>
                  {item.label}
                </p>
                {status === "active" && (
                  <p className="text-[10px] text-emerald-400/80 leading-normal animate-pulse">{item.desc}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Enterprise Retrieval Diagnostics Panel ────────────────────────────
function DiagnosticsInspector({ diagnostics }: { diagnostics: any }) {
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
                <span className="text-neutral-300 italic">"{diagnostics.query}"</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-neutral-500 font-medium">Rewritten Search Query:</span>
                <span className="text-neutral-300 font-semibold text-emerald-400">"{diagnostics.rewrittenQuery}"</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Structured Medical Report Component ─────────────────────────────────
function StructuredMedicalReport({ text }: { text: string }) {
  let parsed: any = null;

  // 1. Try parsing JSON first
  try {
    let clean = text.replace(/^```json/i, "").replace(/```$/i, "").trim();
    const startIdx = clean.indexOf("{");
    const endIdx = clean.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      clean = clean.substring(startIdx, endIdx + 1);
    }
    parsed = JSON.parse(clean);
  } catch (e) {
    parsed = null;
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
  if (!parsed || typeof parsed !== "object" || (!parsed.diagnosis && !parsed.siddha_medicine && !parsed.symptoms)) {
    return <RenderMarkdown text={text} />;
  }

  const {
    diagnosis,
    symptoms,
    siddha_medicine,
    food_recommendation,
    doctor_consultation,
  } = parsed;

  return (
    <div className="space-y-5 w-full text-sm">
      {/* Disclaimer Banner */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 text-neutral-300 text-xs leading-relaxed flex items-start gap-2.5 shadow-sm">
        <Shield className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-emerald-300 font-semibold">Disclaimer:</strong> Siddha recommendations should be used under clinical supervision. Consult a registered Siddha practitioner (BSMS) for formal diagnosis.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Diagnosis & Symptoms Card */}
        {(diagnosis || symptoms) && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 hover:border-white/10 transition-all shadow-md">
            {diagnosis && (
              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  Clinical Impression & Diagnosis
                </h4>
                <div className="text-neutral-200 leading-relaxed text-sm font-medium">
                  <RenderMarkdown text={diagnosis} />
                </div>
              </div>
            )}
            {symptoms && (
              <div className="pt-3 border-t border-white/5">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
                  Symptoms Analysis
                </h4>
                <div className="text-neutral-400 leading-relaxed text-xs">
                  <RenderMarkdown text={symptoms} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Siddha Medicine Card */}
        {siddha_medicine && (
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-2xl p-5 hover:border-emerald-500/30 transition-all shadow-lg">
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Siddha Pharmacopoeia & Therapeutics
            </h4>
            <div className="text-emerald-50 leading-relaxed text-sm">
              <RenderMarkdown text={siddha_medicine} />
            </div>
          </div>
        )}

        {/* Food & Dietary Guidelines */}
        {food_recommendation && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all shadow-md">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              🍎 Food & Dietary Guidelines
            </h4>
            <div className="text-neutral-200 leading-relaxed text-sm">
              <RenderMarkdown text={food_recommendation} />
            </div>
          </div>
        )}

        {/* Clinical Advice */}
        {doctor_consultation && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all shadow-md">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              🧑‍⚕️ Clinical Advice & Practitioner Guidance
            </h4>
            <div className="text-neutral-300 leading-relaxed text-sm italic">
              <RenderMarkdown text={doctor_consultation} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);

  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const [messages, setMessages] = useState<Array<{role: string, content: string, sources?: any[], symptoms_to_ask?: string[], needs_doctor?: boolean, diagnostics?: any}>>([ 
    { role: "assistant", content: "Hey there! 👋 I'm **MedBot**, your friendly Medical Research Assistant.\n\nI can help you explore and understand your medical documents synced in the Knowledge Base. You can ask me anything about Siddha medicine, treatments, and clinical studies!\n\n💡 *Tip: Neenga Tanglish-la kooda kelvi kekalam! I understand and speak Tanglish fluently.* 😊\n\nWhat would you like to explore today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [agentSteps, setAgentSteps] = useState<StepStates>({
    medicalSafety: "pending",
    retrieval: "pending",
    reranking: "pending",
    generator: "pending",
    verification: "pending",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserProfile(data);
    } catch (e) {
      router.push("/login");
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

  const handleNewChat = () => {
    if (loading) return;
    setActiveSessionId(generateUUID());
    setMessages([
      { 
        role: "assistant", 
        content: "Hey there! 👋 I'm **MedBot**, your friendly Medical Research Assistant.\n\nI can help you explore and understand your medical documents synced in the Knowledge Base. You can ask me anything about Siddha medicine, treatments, and clinical studies!\n\n💡 *Tip: Neenga Tanglish-la kooda kelvi kekalam! I understand and speak Tanglish fluently.* 😊\n\nWhat would you like to explore today?" 
      }
    ]);
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
    setActiveSessionId(generateUUID());
    fetchUserProfile();
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const handleSend = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const textToSend = customInput || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: "user", content: textToSend };
    const currentHistory = messages.map(m => ({ role: m.role, content: m.content }));
    
    setMessages(prev => [...prev, userMessage]);
    if (!customInput) setInput("");
    setLoading(true);

    // Initialize agent logger tracking
    setAgentSteps({
      medicalSafety: "pending",
      retrieval: "pending",
      reranking: "pending",
      generator: "pending",
      verification: "pending",
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSend, history: currentHistory, sessionId: activeSessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response reader found");

      let currentAssistantMessage = {
        role: "assistant",
        content: "",
        sources: [],
        symptoms_to_ask: [],
        needs_doctor: false,
        diagnostics: null,
      };

      setMessages(prev => [...prev, currentAssistantMessage]);

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
          let data;
          try {
            data = JSON.parse(rawData);
          } catch (e) {
            console.error("Failed to parse data payload:", rawData, e);
            continue;
          }

          if (event === "node_start") {
            setAgentSteps(prev => ({
              ...prev,
              [data.node]: "active"
            }));
          } else if (event === "node_end") {
            setAgentSteps(prev => ({
              ...prev,
              [data.node]: "completed"
            }));
          } else if (event === "token") {
            currentAssistantMessage.content += data.token;
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...currentAssistantMessage };
              return copy;
            });
          } else if (event === "diagnostics") {
            currentAssistantMessage.diagnostics = data;
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...currentAssistantMessage };
              return copy;
            });
          } else if (event === "done") {
            currentAssistantMessage.content = data.answer;
            currentAssistantMessage.sources = data.sources;
            currentAssistantMessage.symptoms_to_ask = data.symptoms_to_ask;
            currentAssistantMessage.needs_doctor = data.needs_doctor;
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...currentAssistantMessage };
              return copy;
            });
          } else if (event === "error") {
            throw new Error(data.message);
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev.slice(0, -1), // Remove the empty template if error occurred
        { role: "assistant", content: `Oops! Something went wrong while processing your question. 😔\n\n**Error:** ${err.message}\n\nPlease try again, or check if you've uploaded documents first.` }
      ]);
    } finally {
      setLoading(false);
      fetchUserProfile();
      fetchSessions();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`✅ "${file.name}" uploaded — ${data.message}`, "success");
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Great news! 🎉 I've successfully processed **${file.name}**.\n\nThe document has been split into searchable chunks and stored in the knowledge base. You can now ask me questions about its contents!\n\n💡 **Try asking something like:**\n- "What are the main findings?"\n- "Summarize the methodology"\n- "What dosages were mentioned?"` 
      }]);
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl) return;

    setUploading(true);
    try {
      const res = await fetch("/api/ingest/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`✅ Google Sheet synced — ${data.message}`, "success");
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Perfect! 📊 I've synced your Google Sheet data into the knowledge base.\n\nThe spreadsheet has been processed and indexed. You can now query its contents!\n\n💡 **Try asking:**\n- "What data does the sheet contain?"\n- "Show me trends in the data"\n- "Summarize the key metrics"` 
      }]);
      setSheetUrl("");
    } catch (err: any) {
      showToast(`Sheet sync failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([{ 
      role: "assistant", 
      content: "Chat cleared! 🧹\n\nYour uploaded documents are still in the knowledge base — feel free to ask me new questions anytime." 
    }]);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/login", { method: "DELETE" });
      if (res.ok) {
        router.push("/login");
      } else {
        showToast("Failed to log out", "error");
      }
    } catch (e) {
      showToast("An error occurred during logout", "error");
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
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

      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 bg-white/5 border-r border-white/10 backdrop-blur-xl p-6 flex flex-col gap-5 z-10"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                MedBot
              </h1>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Medical RAG Assistant</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
            Powered by <span className="text-emerald-400 font-semibold">NVIDIA Llama 3.3</span> & ChromaDB
          </p>
        </div>

        {/* New Conversation Button */}
        <button
          onClick={handleNewChat}
          className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#7A6430]/20 to-[#C9A84C]/20 border border-[#7A6430]/40 text-[#C9A84C] hover:from-[#C9A84C]/30 hover:to-[#E8C86A]/30 transition-all shadow-md font-bold uppercase tracking-wider"
        >
          <Sparkles className="w-4 h-4 text-[#E8C86A]" /> New Conversation
        </button>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          {/* Recent Consultations (Chat History) */}
          <div className="space-y-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-[#C9A84C]/70 uppercase tracking-wider font-bold">Recent Consultations</span>
              {sessionsLoading && <Loader2 className="w-3 h-3 text-[#C9A84C] animate-spin" />}
            </div>
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
              {sessions.length === 0 ? (
                <div className="text-left py-3 px-2 text-[11px] text-neutral-500 italic">
                  No past conversations
                </div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      activeSessionId === s.id
                        ? "bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#E8C86A]"
                        : "bg-[#0d0d0d] border-white/5 text-neutral-300 hover:bg-white/[0.02] hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-1">
                      <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                      <span className="text-xs truncate font-medium">{s.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-all shrink-0"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Profile Card */}
          {userProfile?.user && (
            <div className="p-4 rounded-xl bg-[#0d0d0d] border border-white/5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7A6430] to-[#C9A84C] flex items-center justify-center text-[#F5F0E8] font-bold">
                  {userProfile.user.name ? userProfile.user.name[0].toUpperCase() : userProfile.user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#F5F0E8] truncate">
                    {userProfile.user.name || "Siddha Researcher"}
                  </h3>
                  <p className="text-[10px] text-neutral-500 truncate">{userProfile.user.email}</p>
                </div>
              </div>

              {/* Role Tier Badge */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Account Level</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  userProfile.user.role === "SUPER_ADMIN" 
                    ? "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30"
                    : userProfile.user.role === "ADMIN"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-white/5 text-neutral-400 border-white/10"
                }`}>
                  {userProfile.user.role === "SUPER_ADMIN" 
                    ? "Super Admin" 
                    : userProfile.user.role === "ADMIN" 
                    ? "Doctor / Admin" 
                    : "Researcher (USER)"}
                </span>
              </div>
            </div>
          )}

          {/* Quota Telemetry Widget */}
          {userProfile && (
            <div className="p-4 rounded-xl bg-[#0d0d0d] border border-[#7A6430]/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider">Usage Telemetry</h4>
                <Activity className="w-4 h-4 text-[#C9A84C] opacity-80" />
              </div>

              {/* Daily Queries */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Daily Quota</span>
                  <span className="font-semibold text-[#F5F0E8]">
                    {userProfile.quota.dailyLimit === 999999 ? "Unlimited" : `${Math.max(0, userProfile.quota.dailyLimit - userProfile.usage.todayCount)} remaining`}
                  </span>
                </div>
                {userProfile.quota.dailyLimit !== 999999 && (
                  <div className="w-full h-1.5 bg-[#020202] border border-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#7A6430] to-[#C9A84C] transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, Math.max(0, ((userProfile.quota.dailyLimit - userProfile.usage.todayCount) / userProfile.quota.dailyLimit) * 100))}%` 
                      }}
                    />
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>Used Today: {userProfile.usage.todayCount}</span>
                  <span>Limit: {userProfile.quota.dailyLimit === 999999 ? "∞" : userProfile.quota.dailyLimit}</span>
                </div>
              </div>

              {/* Monthly Queries */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Monthly Quota</span>
                  <span className="font-semibold text-[#F5F0E8]">
                    {userProfile.quota.monthlyLimit === 999999 ? "Unlimited" : `${Math.max(0, userProfile.quota.monthlyLimit - userProfile.usage.monthlyCount)} remaining`}
                  </span>
                </div>
                {userProfile.quota.monthlyLimit !== 999999 && (
                  <div className="w-full h-1.5 bg-[#020202] border border-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, Math.max(0, ((userProfile.quota.monthlyLimit - userProfile.usage.monthlyCount) / userProfile.quota.monthlyLimit) * 100))}%` 
                      }}
                    />
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>Used Month: {userProfile.usage.monthlyCount}</span>
                  <span>Limit: {userProfile.quota.monthlyLimit === 999999 ? "∞" : userProfile.quota.monthlyLimit}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-2">
          {(userProfile?.user?.role === "ADMIN" || userProfile?.user?.role === "SUPER_ADMIN") && (
            <Link
              href="/admin"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#7A6430]/20 to-[#C9A84C]/20 border border-[#7A6430]/40 text-[#C9A84C] hover:from-[#C9A84C]/20 hover:to-[#E8C86A]/20 transition-all"
            >
              <Shield className="w-4 h-4" /> Admin Portal
            </Link>
          )}
          <button 
            onClick={handleClearChat}
            className="flex items-center justify-center gap-2 w-full text-neutral-400 hover:text-red-400 text-sm transition-colors py-2 rounded-lg hover:bg-red-500/5"
          >
            <Trash2 className="w-4 h-4" /> Clear Chat
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full text-neutral-400 hover:text-[#C9A84C] text-sm transition-colors py-2 rounded-lg hover:bg-[#C9A84C]/5 border border-transparent hover:border-[#7A6430]/30"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto p-8 z-10 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-8 pb-8">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                  </div>
                  
                  <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Role label */}
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      msg.role === 'user' ? 'text-indigo-400/60' : 'text-emerald-400/60'
                    }`}>
                      {msg.role === 'user' ? 'You' : 'MedBot'}
                    </span>
                    
                    <div className={`px-6 py-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-white/10 text-white rounded-tr-none' 
                        : 'bg-white/[0.03] border border-white/10 text-neutral-200 rounded-tl-none backdrop-blur-sm shadow-xl'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                      ) : (
                        <div className="text-sm w-full">
                          {/* Render agent steps execution in real-time when loading/streaming */}
                          {loading && idx === messages.length - 1 && (
                            <ProgressiveAgentLogger steps={agentSteps} />
                          )}

                          <StructuredMedicalReport text={msg.content} />
                          
                          {/* Needs Doctor Warning */}
                          {msg.needs_doctor && (
                            <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3 shadow-lg">
                              <span className="text-lg">⚠️</span>
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider">Clinical Triage Alert</p>
                                <p className="text-xs font-medium leading-relaxed mt-1">Based on these symptoms, it is highly recommended you consult a qualified medical professional immediately.</p>
                              </div>
                            </div>
                          )}

                          {/* Retrieval Diagnostics Telemetry Panel */}
                          {msg.diagnostics && (
                            <DiagnosticsInspector diagnostics={msg.diagnostics} />
                          )}

                          {/* Symptom Follow-ups */}
                          {msg.symptoms_to_ask && msg.symptoms_to_ask.length > 0 && (
                            <SymptomChecklist 
                              symptoms={msg.symptoms_to_ask} 
                              onSymptomSubmit={(selected) => {
                                handleSend(undefined, `I also have these symptoms: ${selected.join(', ')}`);
                              }} 
                              key={`checklist-${idx}`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Sources Expander */}
                    {msg.sources && msg.sources.length > 0 && (
                      <details className="mt-2 w-full group">
                        <summary className="cursor-pointer text-xs font-bold text-emerald-400/80 hover:text-emerald-400 flex items-center gap-2 transition-colors select-none">
                          <FileText className="w-3.5 h-3.5" />
                          {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''} referenced
                          <span className="text-neutral-600 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-3 bg-black/40 rounded-xl border border-white/5 p-4 space-y-3 shadow-inner">
                          {msg.sources.map((src: any, i: number) => (
                            <div key={i} className="text-xs text-neutral-400 bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/[0.08] transition-all">
                              <div className="font-semibold text-neutral-300 mb-1 flex items-center gap-2">
                                <span className="text-emerald-400 font-bold">#{i + 1}</span>
                                {src.file} {src.page !== "?" ? `(Page ${src.page})` : ""}
                              </div>
                              <p className="line-clamp-3 text-neutral-500 leading-relaxed font-serif">{src.text}</p>
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

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pt-10">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative group">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-emerald-500/50 rounded-2xl py-4 pl-6 pr-14 text-sm text-white placeholder-neutral-500 outline-none backdrop-blur-xl transition-all shadow-2xl"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-emerald-500 active:scale-95"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
          <p className="text-center text-xs text-neutral-600 mt-4">
            ⚕️ AI-assisted medical research. Recommendations must be verified by a BSMS or MBBS qualified clinician.
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
              className="w-full max-w-sm p-6 rounded-2xl bg-[#0d0d0d] border border-[#7A6430]/40 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#F5F0E8]">Delete Consultation?</h3>
                <p className="text-xs text-neutral-400">
                  This action will permanently delete all records of this consultation and cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 transition-colors"
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
