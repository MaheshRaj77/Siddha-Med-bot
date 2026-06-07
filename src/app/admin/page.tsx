"use client";

import { useState, useEffect, useCallback, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, MessageSquare, Trash2, RefreshCw,
  FileText, Clock, Zap, HardDrive, Search, ChevronDown,
  ChevronUp, AlertTriangle, Activity,
  Loader2, Sparkles, CheckCircle2, BarChart3, UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/product/DashboardShell";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

interface ChatLog {
  id: string;
  timestamp: string;
  query: string;
  answer: string;
  sources: Array<{ file: string; page: number | string; text: string }>;
  durationMs: number;
}

interface Document {
  name: string;
  chunkCount: number;
  ids: string[];
  sampleText: string;
  source: "chroma" | "postgres";
  type: string | null;
  sourceUrl: string | null;
  documentHash: string | null;
  version: number;
  isActive: boolean;
  ingested: string | null;
  updatedAt: string | null;
}

interface IngestionJobRow {
  id: string;
  fileName: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  chunksCount: number;
  error: string | null;
}

interface Stats {
  totalQueries: number;
  avgResponseMs: number;
  uniqueSourceFiles: number;
}

interface EvaluationRun {
  id: string;
  timestamp: string;
  faithfulness: number;
  answerRelevance: number;
  contextPrecision: number;
  overallScore: number;
  details: unknown;
}

interface EvaluationEngineSnapshot {
  activeChunks: number;
  sourceDocuments: number;
  pendingJobs: number;
  processingJobs: number;
  staticCases: number;
  syntheticSeedChunks: number;
  latestRun?: {
    id: string;
    timestamp: string;
    overallScore: number;
  } | null;
}

interface EvaluationReportSummary {
  totalCases: number;
  staticCases: number;
  syntheticCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  safetyAccuracy: number;
  retrievalCoverage: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
}

interface EvaluationCaseResult {
  query: string;
  expectedTopic: string;
  source: "static" | "synthetic";
  expectedMedical: boolean;
  requiresContext: boolean;
  actualMedical: boolean;
  classificationCorrect: boolean;
  retrievedChunkCount: number;
  verified: boolean;
  needsDoctor: boolean;
  passed: boolean;
  issues: string[];
  answer: string;
  contexts: string[];
  error?: string;
  metrics: {
    faithfulness: number;
    answerRelevance: number;
    contextPrecision: number;
    overall: number;
    latencyMs: number;
  };
}

interface EvaluationReport {
  version: 2;
  generatedAt: string;
  summary: EvaluationReportSummary;
  cases: EvaluationCaseResult[];
}

interface AuthUser {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [activeTab, setActiveTab] = useState<"analytics" | "documents" | "logs" | "evaluations">("analytics");
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [ingestionJobs, setIngestionJobs] = useState<IngestionJobRow[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvaluationRun[]>([]);
  const [stats, setStats] = useState<Stats>({ totalQueries: 0, avgResponseMs: 0, uniqueSourceFiles: 0 });
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [expandedEval, setExpandedEval] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // Knowledge base & evaluation state
  const [updatingSource, setUpdatingSource] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationStartedAt, setEvaluationStartedAt] = useState<number | null>(null);
  const [evaluationElapsedMs, setEvaluationElapsedMs] = useState(0);
  const [evaluationEngine, setEvaluationEngine] = useState<EvaluationEngineSnapshot | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs");
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setStats(data.stats || { totalQueries: 0, avgResponseMs: 0, uniqueSourceFiles: 0 });
      }
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/documents");
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
        setTotalChunks(data.totalChunks || 0);
        setIngestionJobs(data.jobs || []);
      }
    } catch (e) {
      console.error("Failed to fetch documents:", e);
    }
  }, []);

  const fetchEvaluations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/evaluate");
      const data = await res.json();
      if (res.ok) {
        setEvalRuns(data.runs || []);
        setEvaluationEngine(data.engine || null);
      }
    } catch (e) {
      console.error("Failed to fetch evaluations:", e);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchLogs(), fetchDocuments(), fetchEvaluations()]);
    setLoading(false);
  }, [fetchLogs, fetchDocuments, fetchEvaluations]);

  // Auth & role check
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "Unable to verify your session. Please refresh once.", "error");
          return;
        }
        if (!data.user) {
          router.replace("/login");
          return;
        }
        if (data.user.role === "SUPER_ADMIN") {
          router.replace("/super-admin");
          return;
        }
        if (data.user.role !== "ADMIN") {
          router.replace("/chat");
          return;
        }
        setCurrentUser(data.user);
      } catch {
        showToast("Unable to verify your session. Please refresh once.", "error");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadAll();
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser, loadAll]);

  // Poll ingestion jobs if any are pending/processing
  useEffect(() => {
    const hasActiveJobs = ingestionJobs.some(
      (job) => job.status === "PENDING" || job.status === "PROCESSING"
    );
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 4000);

    return () => clearInterval(interval);
  }, [ingestionJobs, fetchDocuments]);

  useEffect(() => {
    if (!evaluating || !evaluationStartedAt) return;

    const interval = setInterval(() => {
      setEvaluationElapsedMs(Date.now() - evaluationStartedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [evaluating, evaluationStartedAt]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const results = await Promise.allSettled(Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/ingest", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(`"${file.name}": ${data.error}`);
        return data.message || `"${file.name}" queued.`;
      }));

      const failures = results.filter((result) => result.status === "rejected") as PromiseRejectedResult[];
      if (failures.length > 0) {
        showToast(`Failed to add some resources: ${failures.map((failure) => failure.reason.message).join(", ")}`, "error");
      } else {
        showToast(`Started indexing ${results.length} resource(s).`, "success");
      }
      await fetchDocuments();
    } catch (err: unknown) {
      showToast(`Knowledge add failed: ${getErrorMessage(err, "Unknown add error")}`, "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = sheetUrl
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter(Boolean);
    if (urls.length === 0) return;

    setUploading(true);
    try {
      const results = await Promise.allSettled(urls.map(async (url) => {
        const res = await fetch("/api/ingest/sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`"${url}": ${data.error}`);
        return data.message || `"${url}" queued.`;
      }));

      const failures = results.filter((result) => result.status === "rejected") as PromiseRejectedResult[];
      if (failures.length > 0) {
        showToast(`Failed to sync some resources: ${failures.map((failure) => failure.reason.message).join(", ")}`, "error");
      } else {
        showToast(`Started syncing ${results.length} source(s).`, "success");
      }
      setSheetUrl("");
      await fetchDocuments();
    } catch (err: unknown) {
      showToast(`Sheet sync failed: ${getErrorMessage(err, "Unknown sync error")}`, "error");
    } finally {
      setUploading(false);
    }
  };

  // Trigger Benchmark Evaluation
  const handleTriggerEvaluation = async () => {
    if (!confirm("Start advanced synthetic Ragas-style evaluation benchmark? This runs multiple Llama-3.3 checking iterations and takes ~30-45 seconds.")) return;
    
    setEvaluating(true);
    setEvaluationStartedAt(Date.now());
    setEvaluationElapsedMs(0);
    try {
      const res = await fetch("/api/admin/evaluate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.engine) setEvaluationEngine(data.engine);
      showToast("✅ Benchmark evaluation run complete!", "success");
      await fetchEvaluations();
    } catch (e: unknown) {
      showToast(`Evaluation run failed: ${getErrorMessage(e, "Unknown evaluation error")}`, "error");
    } finally {
      setEvaluating(false);
      setEvaluationStartedAt(null);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"? This will remove ${doc.chunkCount} chunks from the active knowledge base. This action cannot be undone.`)) return;

    setDeleting(doc.name);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: doc.name, ids: doc.ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Deleted "${doc.name}" (${doc.chunkCount} chunks)`, "success");
      await fetchDocuments();
    } catch (e: unknown) {
      showToast(`Failed to delete: ${getErrorMessage(e, "Unknown delete error")}`, "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleDocumentActive = async (doc: Document) => {
    setUpdatingSource(doc.name);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: doc.name, isActive: !doc.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`${doc.name} ${doc.isActive ? "deactivated" : "activated"}`, "success");
      await fetchDocuments();
    } catch (e: unknown) {
      showToast(`Failed to update source: ${getErrorMessage(e, "Unknown update error")}`, "error");
    } finally {
      setUpdatingSource(null);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Clear all chat logs? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/logs", { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
        setStats({ totalQueries: 0, avgResponseMs: 0, uniqueSourceFiles: 0 });
        showToast("Chat logs cleared", "success");
      }
    } catch {
      showToast("Failed to clear logs", "error");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };

  const filteredLogs = searchQuery
    ? logs.filter(
        (l) =>
          l.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };
  const activeDocuments = documents.filter((doc) => doc.isActive);
  const inactiveDocuments = documents.filter((doc) => !doc.isActive);
  const activeChunks = activeDocuments.reduce((sum, doc) => sum + doc.chunkCount, 0);

  return (
    <DashboardShell
      role="Doctor Admin"
      eyebrow="Knowledge Operations"
      title="Doctor Admin Workspace"
      description="Curate the Siddha knowledge base, review conversations, and measure answer quality."
      email={currentUser?.email}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={loadAll}
      refreshing={loading}
      onLogout={handleLogout}
      navItems={[
        {
          id: "analytics",
          label: "Analytics",
          description: "Search and engagement trends",
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          id: "documents",
          label: "Knowledge Base",
          description: "Curated source controls",
          icon: <Database className="h-4 w-4" />,
          count: documents.length,
        },
        {
          id: "logs",
          label: "Query Logs",
          description: "Review assistant activity",
          icon: <Activity className="h-4 w-4" />,
          count: logs.length,
        },
        {
          id: "evaluations",
          label: "Ragas Evaluations",
          description: "Track answer quality",
          icon: <Sparkles className="h-4 w-4" />,
          count: evalRuns.length,
        },
      ]}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border backdrop-blur-xl text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/15 border-red-500/30 text-red-300"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare className="w-5 h-5 animate-pulse" />}
          label="Total Queries"
          value={stats.totalQueries.toString()}
          color="from-blue-500 to-indigo-600"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Avg Response"
          value={stats.avgResponseMs > 0 ? `${(stats.avgResponseMs / 1000).toFixed(1)}s` : "—"}
          color="from-amber-500 to-orange-600"
        />
        <StatCard
          icon={<HardDrive className="w-5 h-5" />}
          label="Total Chunks"
          value={totalChunks.toString()}
          color="from-teal-500 to-emerald-600"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Documents"
          value={documents.length.toString()}
          color="from-purple-500 to-pink-600"
        />
      </div>

        {activeTab === "analytics" && <AnalyticsDashboard />}

        {/* Tab Content: Documents Ingestion */}
        {activeTab === "documents" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={<FileText className="w-5 h-5" />} label="Active Sources" value={activeDocuments.length.toString()} color="from-emerald-500 to-teal-600" />
              <StatCard icon={<HardDrive className="w-5 h-5" />} label="Active Chunks" value={activeChunks.toString()} color="from-blue-500 to-indigo-600" />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Inactive Sources" value={inactiveDocuments.length.toString()} color="from-amber-500 to-orange-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Knowledge Base Policy</h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-normal">Users can ask only from curated resources already indexed in this project. Deactivated sources are hidden from retrieval without deleting their chunks.</p>
                </div>
                <div className="space-y-3 text-xs text-neutral-400">
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Source-grounded answers only</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Activation controls retrieval visibility</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Admins can add, deactivate, or delete platform knowledge</p>
                </div>
                <div className="space-y-3 rounded-xl border border-white/5 bg-black/20 p-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-300">Add Internal Resource</h4>
                  <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-center transition hover:border-teal-500/30 hover:bg-white/10">
                    {uploading ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-teal-400" /> : <UploadCloud className="mb-2 h-6 w-6 text-teal-400" />}
                    <span className="text-xs font-bold text-neutral-300">Add PDF, CSV, or XLSX</span>
                    <span className="mt-1 text-[10px] text-neutral-600">Admin-only corpus indexing</span>
                    <input type="file" className="hidden" accept=".pdf,.csv,.xlsx" onChange={handleFileUpload} disabled={uploading} multiple />
                  </label>
                </div>
                <form onSubmit={handleSheetSubmit} className="space-y-3 rounded-xl border border-white/5 bg-black/20 p-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-300">Sync Sheet Resource</h4>
                  <textarea
                    placeholder="Paste Google Sheets links, one per line"
                    value={sheetUrl}
                    onChange={(event) => setSheetUrl(event.target.value)}
                    rows={3}
                    disabled={uploading}
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-teal-500/40"
                  />
                  <button
                    type="submit"
                    disabled={!sheetUrl.trim() || uploading}
                    className="w-full rounded-lg border border-teal-500/20 bg-teal-500/10 py-2 text-xs font-bold text-teal-400 transition hover:bg-teal-500/20 disabled:opacity-50"
                  >
                    {uploading ? "Indexing..." : "Sync Sheet Into Knowledge Base"}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={fetchDocuments}
                  className="w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  Refresh Source Inventory
                </button>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h2 className="text-md font-bold text-neutral-300">
                    Curated Knowledge Sources
                  </h2>
                  <span className="text-xs text-neutral-500 font-medium">({documents.length} Total)</span>
                </div>

                {ingestionJobs.some((job) => job.status !== "COMPLETED") && (
                  <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Ingestion status</p>
                    {ingestionJobs.filter((job) => job.status !== "COMPLETED").map((job) => (
                      <div key={job.id} className="rounded-lg border border-white/5 bg-black/20 p-2 text-xs text-neutral-300">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate font-semibold">{job.fileName}</span>
                          <span className={job.status === "FAILED" ? "text-red-400" : "text-amber-300"}>{job.status}</span>
                        </div>
                        {job.error && <p className="mt-1 text-[11px] text-red-300">{job.error}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-6 h-6 text-teal-500 animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-16 text-neutral-500 bg-white/[0.01] border border-white/5 rounded-xl">
                    <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No indexed sources found</p>
                    <p className="text-xs mt-1">Add resources through the internal ingestion pipeline to populate the curated knowledge base.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {documents.map((doc) => (
                      <motion.div
                        key={doc.name}
                        className={`bg-white/[0.02] border rounded-xl p-4 transition-all flex items-start justify-between gap-4 ${doc.isActive ? "border-white/5 hover:border-white/10" : "border-amber-500/20 opacity-75"}`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${doc.isActive ? "bg-teal-500/10" : "bg-amber-500/10"}`}>
                            <FileText className={`w-5 h-5 ${doc.isActive ? "text-teal-400" : "text-amber-300"}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-white truncate">{doc.name}</h3>
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${doc.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                                {doc.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-neutral-500 font-mono">
                              <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{doc.chunkCount} chunks</span>
                              <span>v{doc.version}</span>
                              {doc.type && <span>{doc.type}</span>}
                              {doc.ingested && <span>{formatTime(doc.ingested)}</span>}
                            </div>
                            {doc.sampleText && (
                              <p className="text-[11px] text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
                                {doc.sampleText}...
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            onClick={() => handleToggleDocumentActive(doc)}
                            disabled={updatingSource === doc.name}
                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-all disabled:opacity-50 ${doc.isActive ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20" : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20"}`}
                          >
                            {updatingSource === doc.name ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                            {doc.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc)}
                            disabled={deleting === doc.name}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all disabled:opacity-50"
                          >
                            {deleting === doc.name ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab Content: Logs */}
        {activeTab === "logs" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search questions & answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                {logs.length > 0 && (
                  <>
                    <button
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
                        const dlAnchorElem = document.createElement('a');
                        dlAnchorElem.setAttribute("href", dataStr);
                        dlAnchorElem.setAttribute("download", `medbot_dataset_${new Date().toISOString().split('T')[0]}.json`);
                        dlAnchorElem.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg transition-all font-bold"
                    >
                      <Database className="w-4 h-4" />
                      Export Dataset
                    </button>
                    <button
                      onClick={handleClearLogs}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-all font-bold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All
                    </button>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20 text-neutral-500 bg-white/[0.01] border border-white/5 rounded-xl">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">
                  {searchQuery ? "No matching questions" : "No questions yet"}
                </p>
                <p className="text-sm mt-1">
                  {searchQuery ? "Try a different search term" : "Chat interactions will appear here in real-time."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all"
                  >
                    <button
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="w-full text-left p-4 flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-xs truncate pr-4">{log.query}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(log.timestamp)}
                          </span>
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 animate-pulse" />
                            {(log.durationMs / 1000).toFixed(1)}s
                          </span>
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {log.sources.length} sources
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-neutral-500">
                        {expandedLog === log.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedLog === log.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3 bg-black/30 text-xs"
                        >
                          <div>
                            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">User Query</h4>
                            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 text-neutral-300 leading-relaxed font-mono">
                              {log.query}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1.5">MedBot Response</h4>
                            <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-3 max-h-52 overflow-y-auto leading-relaxed text-neutral-300 font-serif">
                              {(() => {
                                try {
                                  const parsed = JSON.parse(log.answer);
                                  return (
                                    <div className="space-y-2">
                                      <p className="whitespace-pre-wrap">{parsed.answer}</p>
                                      {parsed.symptoms_to_ask && parsed.symptoms_to_ask.length > 0 && (
                                        <div className="mt-2 bg-white/5 p-2 rounded-md font-sans">
                                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Requested Symptoms:</p>
                                          <div className="flex flex-wrap gap-1.5 mt-1">
                                            {parsed.symptoms_to_ask.map((s: string, i: number) => (
                                              <span key={i} className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-500/20">{s}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {parsed.needs_doctor && (
                                        <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded inline-flex items-center gap-1 font-sans">
                                          ⚠️ Clinical Triage Doctor Visit Recommended
                                        </div>
                                      )}
                                    </div>
                                  );
                                } catch {
                                  return <p className="whitespace-pre-wrap">{log.answer}</p>;
                                }
                              })()}
                            </div>
                          </div>

                          {log.sources.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1.5">Referenced Sources ({log.sources.length})</h4>
                              <div className="space-y-2">
                                {log.sources.map((src, i) => (
                                  <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 font-sans leading-relaxed text-neutral-400">
                                    <div className="flex items-center gap-1.5 mb-1 font-semibold text-neutral-300">
                                      <span className="text-amber-400 font-bold">#{i + 1}</span>
                                      <span>{src.file}</span>
                                      {src.page !== "?" && <span className="text-neutral-500 text-[10px]">(Page {src.page})</span>}
                                    </div>
                                    <p className="font-serif italic text-neutral-500 line-clamp-3">&ldquo;{src.text}&rdquo;</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab Content: Evaluations */}
        {activeTab === "evaluations" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  RAG System Evaluation & Benchmark Suite
                </h2>
                <p className="text-xs text-neutral-500 mt-1 leading-normal">
                  Ragas-style performance evaluations running LLM-as-a-judge tests across synthetic datasets.
                </p>
              </div>

              <button
                onClick={handleTriggerEvaluation}
                disabled={evaluating}
                className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black rounded-xl transition-all shadow-lg shadow-amber-500/10 active:scale-95 disabled:opacity-50 shrink-0 font-sans"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    Running LLM Judges...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 text-black" />
                    Run Benchmark Evaluation
                  </>
                )}
              </button>
            </div>

            <EvaluationEnginePanel
              evaluating={evaluating}
              elapsedMs={evaluationElapsedMs}
              engine={evaluationEngine}
              totalChunks={totalChunks}
              documentsCount={documents.length}
            />

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
              </div>
            ) : evalRuns.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 bg-white/[0.01] border border-white/5 rounded-xl">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30 text-amber-400" />
                <p className="text-md font-medium text-white">No evaluation benchmarks run yet</p>
                <p className="text-xs mt-1 max-w-md mx-auto leading-relaxed">
                  Trigger an evaluation benchmark run to test the RAG search precision, faithfulness, and answer relevance on synthetic medical scenarios.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Metric Summary Grid of Latest Run */}
                {evalRuns[0] && (
                  <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Latest Benchmark Run ({formatTime(evalRuns[0].timestamp)})
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">ID: {evalRuns[0].id}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <EvalMetricCard label="Mean Faithfulness" val={evalRuns[0].faithfulness} />
                      <EvalMetricCard label="Mean Relevance" val={evalRuns[0].answerRelevance} />
                      <EvalMetricCard label="Mean Precision" val={evalRuns[0].contextPrecision} />
                      <EvalMetricCard label="Mean Overall Score" val={evalRuns[0].overallScore} highlighted />
                    </div>
                    <LatestEvaluationOperations details={evalRuns[0].details} />
                  </div>
                )}

                {/* Runs History */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-white/5 pb-2">Historical Benchmarks Runs</h3>
                  {evalRuns.map((run) => (
                    <div
                      key={run.id}
                      className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all text-xs"
                    >
                      <button
                        onClick={() => setExpandedEval(expandedEval === run.id ? null : run.id)}
                        className="w-full text-left p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">Run Benchmark Summary</p>
                            <p className="text-[10px] text-neutral-500 mt-1 font-mono">{formatTime(run.timestamp)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-500 uppercase font-medium">Overall Score</span>
                            <p className="text-sm font-bold text-amber-400 font-mono">{(run.overallScore * 100).toFixed(1)}%</p>
                          </div>
                          <div className="text-neutral-500">
                            {expandedEval === run.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedEval === run.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 border-t border-white/5 pt-3 bg-black/20"
                          >
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 text-center">
                                <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">Faithfulness</span>
                                <p className="text-sm font-mono font-bold mt-1">{(run.faithfulness * 100).toFixed(1)}%</p>
                              </div>
                              <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 text-center">
                                <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">Answer Relevance</span>
                                <p className="text-sm font-mono font-bold mt-1">{(run.answerRelevance * 100).toFixed(1)}%</p>
                              </div>
                              <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 text-center">
                                <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">Context Precision</span>
                                <p className="text-sm font-mono font-bold mt-1">{(run.contextPrecision * 100).toFixed(1)}%</p>
                              </div>
                            </div>

                            <EvaluationRunDiagnostics details={run.details} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
    </DashboardShell>
  );
}

function EvaluationEnginePanel({
  evaluating,
  elapsedMs,
  engine,
  totalChunks,
  documentsCount,
}: {
  evaluating: boolean;
  elapsedMs: number;
  engine: EvaluationEngineSnapshot | null;
  totalChunks: number;
  documentsCount: number;
}) {
  const activeChunks = engine?.activeChunks ?? totalChunks;
  const sourceDocuments = engine?.sourceDocuments ?? documentsCount;
  const pendingJobs = engine?.pendingJobs ?? 0;
  const processingJobs = engine?.processingJobs ?? 0;
  const staticCases = engine?.staticCases ?? 6;
  const syntheticSeedChunks = engine?.syntheticSeedChunks ?? Math.min(activeChunks, 2);
  const totalPlannedCases = staticCases + syntheticSeedChunks;
  const phase = getEvaluationPhase(elapsedMs);
  const hasActiveIngestion = pendingJobs + processingJobs > 0;

  return (
    <div className={`rounded-2xl border p-4 ${evaluating ? "border-amber-500/25 bg-amber-500/5" : "border-white/5 bg-white/[0.015]"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${evaluating ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-neutral-300"}`}>
            {evaluating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              {evaluating ? "Active RAG Evaluation Running" : "Active RAG Evaluation Ready"}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {evaluating ? phase.label : `${totalPlannedCases} planned checks against the active knowledge base`}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
              {evaluating
                ? phase.hint
                : "Benchmark uses current Postgres chunks, retrieval/reranking, answer generation, verification, and LLM-as-judge scoring."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
          <EngineSignal icon={<HardDrive className="h-3.5 w-3.5" />} label="Chunks" value={activeChunks.toLocaleString()} tone={activeChunks > 0 ? "good" : "warn"} />
          <EngineSignal icon={<FileText className="h-3.5 w-3.5" />} label="Sources" value={sourceDocuments.toLocaleString()} tone={sourceDocuments > 0 ? "good" : "warn"} />
          <EngineSignal icon={<Search className="h-3.5 w-3.5" />} label="Cases" value={totalPlannedCases.toLocaleString()} tone="good" />
          <EngineSignal icon={<Clock className="h-3.5 w-3.5" />} label={evaluating ? "Elapsed" : "Last Run"} value={evaluating ? formatDuration(elapsedMs) : formatLatestRun(engine)} tone={evaluating ? "warn" : "good"} />
        </div>
      </div>

      {(evaluating || hasActiveIngestion) && (
        <div className="mt-4 border-t border-white/5 pt-4">
          {evaluating && (
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                <span>{phase.label}</span>
                <span>{Math.round(phase.progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${phase.progress}%` }} />
              </div>
            </div>
          )}

          {hasActiveIngestion && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {pendingJobs} pending and {processingJobs} processing ingestion job(s). Evaluation uses only chunks already active in Postgres.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EngineSignal({
  icon,
  label,
  value,
  tone,
}: {
  icon: JSX.Element;
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <div className={`mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${tone === "good" ? "text-emerald-300" : "text-amber-300"}`}>
        {icon}
        {label}
      </div>
      <p className="truncate font-mono text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function getEvaluationPhase(elapsedMs: number) {
  const elapsedSeconds = elapsedMs / 1000;
  if (elapsedSeconds < 5) {
    return {
      label: "Preparing synthetic cases",
      hint: "Sampling active chunks and generating benchmark prompts.",
      progress: Math.max(8, elapsedSeconds * 8),
    };
  }
  if (elapsedSeconds < 25) {
    return {
      label: "Running retrieval and agent graph",
      hint: "Classifying questions, retrieving chunks, reranking context, and generating grounded answers.",
      progress: 40 + ((elapsedSeconds - 5) / 20) * 32,
    };
  }
  if (elapsedSeconds < 50) {
    return {
      label: "Scoring with LLM judges",
      hint: "Checking faithfulness, answer relevance, context precision, and safety routing.",
      progress: 72 + ((elapsedSeconds - 25) / 25) * 20,
    };
  }
  return {
    label: "Finalizing report",
    hint: "Saving the benchmark run and refreshing evaluation history.",
    progress: 95,
  };
}

function formatDuration(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatLatestRun(engine: EvaluationEngineSnapshot | null) {
  if (!engine?.latestRun) return "None";
  return formatPercentage(engine.latestRun.overallScore);
}

// ── Stat Card Component ────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: JSX.Element;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center opacity-85 shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Evaluation Metric Card Component ───────────────────────────────────
function EvalMetricCard({ label, val, highlighted }: { label: string; val: number; highlighted?: boolean }) {
  const percentage = (val * 100).toFixed(1);
  return (
    <div className={`p-4 rounded-xl border text-center ${
      highlighted
        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
        : "bg-white/5 border-white/5 text-neutral-200"
    }`}>
      <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">{label}</span>
      <p className="text-2xl font-bold font-mono mt-1">{percentage}%</p>
      
      {/* Visual meter bar */}
      <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-3 max-w-[80px] mx-auto">
        <div 
          className={`h-full ${highlighted ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function LatestEvaluationOperations({ details }: { details: unknown }) {
  const report = getEvaluationReport(details);
  if (!report) return null;

  const { summary } = report;
  return (
    <div className="mt-5 border-t border-amber-500/15 pt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Operational Signals</h3>
        <span className="text-[10px] font-mono text-neutral-500">
          {summary.totalCases} cases · {summary.staticCases} fixed · {summary.syntheticCases} synthetic
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OperationalMetricCard label="Pass Rate" value={formatPercentage(summary.passRate)} hint={`${summary.passedCases}/${summary.totalCases} cases`} tone={summary.passRate >= 0.8 ? "good" : "warn"} />
        <OperationalMetricCard label="Safety Routing" value={formatPercentage(summary.safetyAccuracy)} hint="medical classifier" tone={summary.safetyAccuracy === 1 ? "good" : "warn"} />
        <OperationalMetricCard label="Retrieval Coverage" value={formatPercentage(summary.retrievalCoverage)} hint="medical cases with context" tone={summary.retrievalCoverage >= 0.9 ? "good" : "warn"} />
        <OperationalMetricCard label="Avg / P95 Latency" value={`${formatLatency(summary.averageLatencyMs)} / ${formatLatency(summary.p95LatencyMs)}`} hint="end-to-end response" tone={summary.p95LatencyMs <= 12000 ? "good" : "warn"} />
      </div>
    </div>
  );
}

function OperationalMetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "good" | "warn";
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className={`mt-1 text-lg font-bold font-mono ${tone === "good" ? "text-emerald-300" : "text-amber-300"}`}>{value}</p>
      <p className="mt-1 text-[10px] text-neutral-600">{hint}</p>
    </div>
  );
}

function EvaluationRunDiagnostics({ details }: { details: unknown }) {
  const report = getEvaluationReport(details);
  if (!report) {
    return (
      <div>
        <h4 className="mb-1 text-[9px] font-bold uppercase tracking-widest text-amber-400">Legacy Execution Output</h4>
        <pre className="max-h-52 overflow-x-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-black/60 p-3 font-mono text-[10px] leading-relaxed text-neutral-400">
          {typeof details === "string" ? details : JSON.stringify(details, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">{report.summary.passedCases} passed</span>
        <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-300">{report.summary.failedCases} review</span>
        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-300">{report.summary.syntheticCases} synthetic</span>
      </div>
      <div className="space-y-2">
        {report.cases.map((item, index) => (
          <div key={`${item.query}-${index}`} className={`rounded-lg border p-3 ${item.passed ? "border-emerald-500/15 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${item.passed ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                    {item.passed ? "Pass" : "Review"}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">{item.source}</span>
                  <span className="text-[9px] text-neutral-500">{item.retrievedChunkCount} chunks</span>
                </div>
                <p className="mt-2 font-semibold leading-relaxed text-neutral-200">{item.query}</p>
                <p className="mt-1 text-[10px] text-neutral-500">Expected: {item.expectedTopic}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-mono text-sm font-bold ${item.passed ? "text-emerald-300" : "text-red-300"}`}>{formatPercentage(item.metrics.overall)}</p>
                <p className="mt-1 text-[10px] font-mono text-neutral-500">{formatLatency(item.metrics.latencyMs)}</p>
              </div>
            </div>
            {item.issues.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-white/5 pt-2">
                {item.issues.map((issue) => (
                  <li key={issue} className="flex gap-2 text-[10px] leading-relaxed text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getEvaluationReport(details: unknown): EvaluationReport | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const candidate = details as Partial<EvaluationReport>;
  if (candidate.version !== 2 || !candidate.summary || !Array.isArray(candidate.cases)) return null;
  return candidate as EvaluationReport;
}

function formatPercentage(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLatency(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}
