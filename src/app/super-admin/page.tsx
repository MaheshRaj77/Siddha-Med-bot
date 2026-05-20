"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Settings, BarChart3, Shield, Crown,
  UserCheck, UserX, ChevronDown, ChevronUp,
  RefreshCw, Loader2, LogOut, ArrowLeft,
  Trash2, Activity, Gauge, Save, Database,
  MessageSquare, FileText, Clock, Zap, HardDrive,
  Search, AlertTriangle, UploadCloud, Link as LinkIcon,
  Sparkles, CheckCircle2
} from "lucide-react";
import Link from "next/link";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  isActive: boolean;
  createdAt: string;
  totalQueries: number;
  totalSessions: number;
  todayQueries: number;
  monthlyQueries: number;
}

interface QuotaRow {
  role: string;
  dailyQueryLimit: number;
  monthlyQueryLimit: number;
  maxFileUploads: number;
  id: string | null;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  totalQueries: number;
  todayQueries: number;
  weeklyUsage: { date: string; count: number }[];
  roleDistribution: { role: string; count: number }[];
}

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
}

interface AdminStats {
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
  details: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  ADMIN: { label: "Doctor", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  USER: { label: "User", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
};

export default function SuperAdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "quotas" | "documents" | "logs" | "evaluations"
  >("overview");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [quotas, setQuotas] = useState<QuotaRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [savingQuota, setSavingQuota] = useState<string | null>(null);

  // Admin-specific states
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvaluationRun[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats>({ totalQueries: 0, avgResponseMs: 0, uniqueSourceFiles: 0 });
  const [totalChunks, setTotalChunks] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [expandedEval, setExpandedEval] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check auth and role
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!data.user || data.user.role !== "SUPER_ADMIN") {
        router.push("/chat");
        return;
      }
      setCurrentUser(data.user);
    })();
  }, [router]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/super-admin/users");
    const data = await res.json();
    if (res.ok) setUsers(data.users || []);
  }, []);

  const fetchQuotas = useCallback(async () => {
    const res = await fetch("/api/super-admin/quotas");
    const data = await res.json();
    if (res.ok) setQuotas(data.quotas || []);
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/super-admin/stats");
    const data = await res.json();
    if (res.ok) setStats(data);
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs");
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setAdminStats(data.stats || { totalQueries: 0, avgResponseMs: 0, uniqueSourceFiles: 0 });
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
      }
    } catch (e) {
      console.error("Failed to fetch evaluations:", e);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    if (activeTab === "overview" || activeTab === "users" || activeTab === "quotas") {
      await Promise.all([fetchUsers(), fetchQuotas(), fetchStats()]);
    } else if (activeTab === "documents") {
      await fetchDocuments();
    } else if (activeTab === "logs") {
      await fetchLogs();
    } else if (activeTab === "evaluations") {
      await fetchEvaluations();
    }
    setLoading(false);
  }, [activeTab, fetchUsers, fetchQuotas, fetchStats, fetchDocuments, fetchLogs, fetchEvaluations]);

  useEffect(() => {
    if (currentUser) loadAll();
  }, [currentUser, activeTab, loadAll]);

  // Update user role
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Role updated to ${ROLE_LABELS[newRole]?.label || newRole}`, "success");
      await fetchUsers();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Toggle user active
  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive: !isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(isActive ? "User deactivated" : "User activated", "success");
      await fetchUsers();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("User deleted", "success");
      await fetchUsers();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Save quota
  const handleSaveQuota = async (q: QuotaRow) => {
    setSavingQuota(q.role);
    try {
      const res = await fetch("/api/super-admin/quotas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: q.role,
          dailyQueryLimit: q.dailyQueryLimit,
          monthlyQueryLimit: q.monthlyQueryLimit,
          maxFileUploads: q.maxFileUploads,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      showToast(`${ROLE_LABELS[q.role]?.label} quota updated`, "success");
      await fetchQuotas();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSavingQuota(null);
    }
  };

  // Update quota state locally
  const updateQuota = (role: string, field: string, value: number) => {
    setQuotas((prev) =>
      prev.map((q) => (q.role === role ? { ...q, [field]: value } : q))
    );
  };

  // File Upload Ingestion
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
      showToast(`✅ "${file.name}" uploaded successfully!`, "success");
      await fetchDocuments();
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Google Sheets Ingestion
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
      showToast(`✅ Google Sheet synced successfully!`, "success");
      setSheetUrl("");
      await fetchDocuments();
    } catch (err: any) {
      showToast(`Sheet sync failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  // Trigger Benchmark Evaluation
  const handleTriggerEvaluation = async () => {
    if (!confirm("Start advanced synthetic Ragas-style evaluation benchmark? This runs multiple Llama-3.3 checking iterations and takes ~30-45 seconds.")) return;
    
    setEvaluating(true);
    try {
      const res = await fetch("/api/admin/evaluate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("✅ Benchmark evaluation run complete!", "success");
      await fetchEvaluations();
    } catch (e: any) {
      showToast(`Evaluation run failed: ${e.message}`, "error");
    } finally {
      setEvaluating(false);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"? This will remove ${doc.chunkCount} chunks from ChromaDB. This action cannot be undone.`)) return;

    setDeleting(doc.name);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: doc.ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Deleted "${doc.name}" (${doc.chunkCount} chunks)`, "success");
      await fetchDocuments();
    } catch (e: any) {
      showToast(`Failed to delete: ${e.message}`, "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Clear all chat logs? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/logs", { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
        setAdminStats({ totalQueries: 0, avgResponseMs: 0, uniqueSourceFiles: 0 });
        showToast("Chat logs cleared", "success");
      }
    } catch (e: any) {
      showToast("Failed to clear logs", "error");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060606" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gold-primary)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#060606", color: "#F5F0E8" }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-5 py-3 text-[12px] font-medium"
            style={{
              background: toast.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: toast.type === "success" ? "#22c55e" : "#f87171",
              borderRadius: 4,
              backdropFilter: "blur(12px)",
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: "rgba(6,6,6,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/chat" className="flex items-center gap-2 text-[12px] transition-colors" style={{ color: "var(--text-tertiary)" }}>
              <ArrowLeft size={14} /> Back
            </Link>
            <div className="w-px h-5" style={{ background: "rgba(201,168,76,0.15)" }} />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 2 }}>
                <Crown size={16} style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <h1 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Super Admin Console</h1>
                <p className="text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--gold-dim)" }}>SYSTEM · INGESTION · USERS · QUOTAS</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={loadAll} disabled={loading} className="p-2 transition-colors" style={{ color: "var(--text-tertiary)" }}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-[11px] font-semibold tracking-[0.06em] transition-all" style={{ border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", borderRadius: 2 }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Tab navigation */}
        <div className="flex flex-wrap gap-1.5 p-1.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.06)", borderRadius: 2, width: "fit-content" }}>
          {([
            { id: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
            { id: "users", label: "Users & Roles", icon: <Users size={14} /> },
            { id: "quotas", label: "Query Quotas", icon: <Gauge size={14} /> },
            { id: "documents", label: "Dataset & Ingestion", icon: <Database size={14} /> },
            { id: "logs", label: "Query Logs", icon: <MessageSquare size={14} /> },
            { id: "evaluations", label: "Ragas Evaluations", icon: <Sparkles size={14} /> },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-5 py-2.5 text-[12px] font-medium transition-all"
              style={{
                color: activeTab === tab.id ? "var(--gold-primary)" : "var(--text-tertiary)",
                background: activeTab === tab.id ? "rgba(201,168,76,0.06)" : "transparent",
                border: activeTab === tab.id ? "1px solid rgba(201,168,76,0.15)" : "1px solid transparent",
                borderRadius: 2,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Overview ───────────────────────────── */}
        {activeTab === "overview" && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Total Users", value: stats.totalUsers, icon: <Users size={18} /> },
                { label: "Active Users", value: stats.activeUsers, icon: <UserCheck size={18} /> },
                { label: "Doctors", value: stats.adminCount, icon: <Shield size={18} /> },
                { label: "Total Queries", value: stats.totalQueries, icon: <Activity size={18} /> },
                { label: "Today's Queries", value: stats.todayQueries, icon: <Gauge size={18} /> },
              ].map((s) => (
                <div key={s.label} className="p-5 transition-all duration-200" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.06)", borderRadius: 2 }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.06)")}>
                  <div className="flex items-center gap-2 mb-3" style={{ color: "var(--gold-dim)" }}>
                    {s.icon}
                    <span className="text-[10px] font-semibold tracking-[0.12em] uppercase">{s.label}</span>
                  </div>
                  <div className="text-[32px] font-black" style={{ color: "var(--gold-primary)" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Role distribution */}
            <div className="p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.06)", borderRadius: 2 }}>
              <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--text-tertiary)" }}>Role Distribution</h3>
              <div className="flex gap-6">
                {stats.roleDistribution.map((r) => {
                  const info = ROLE_LABELS[r.role] || { label: r.role, color: "#888", bg: "rgba(136,136,136,0.1)" };
                  return (
                    <div key={r.role} className="flex items-center gap-3">
                      <div className="w-3 h-3" style={{ background: info.color, borderRadius: 1 }} />
                      <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                        {info.label}: <strong style={{ color: "var(--text-primary)" }}>{r.count}</strong>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB: Users ──────────────────────────────── */}
        {activeTab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>All Users ({users.length})</h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--gold-primary)" }} />
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const roleInfo = ROLE_LABELS[u.role];
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className="p-5 transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: `1px solid ${isSelf ? "rgba(245,158,11,0.2)" : "rgba(201,168,76,0.06)"}`,
                        borderRadius: 2,
                        opacity: u.isActive ? 1 : 0.5,
                      }}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                              {u.name || u.email}
                            </span>
                            <span className="text-[9px] font-bold tracking-[0.1em] px-2 py-0.5" style={{ background: roleInfo.bg, color: roleInfo.color, border: `1px solid ${roleInfo.color}30`, borderRadius: 2 }}>
                              {roleInfo.label.toUpperCase()}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-bold tracking-[0.1em] px-2 py-0.5" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 2 }}>YOU</span>
                            )}
                            {!u.isActive && (
                              <span className="text-[9px] font-bold tracking-[0.1em] px-2 py-0.5" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 2 }}>DEACTIVATED</span>
                            )}
                          </div>
                          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{u.email}</p>
                          <div className="flex gap-6 mt-3">
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Today: <strong style={{ color: "var(--gold-primary)" }}>{u.todayQueries}</strong></span>
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Monthly: <strong style={{ color: "var(--gold-primary)" }}>{u.monthlyQueries}</strong></span>
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Total: <strong style={{ color: "var(--text-primary)" }}>{u.totalQueries}</strong></span>
                          </div>
                        </div>

                        {/* Actions */}
                        {!isSelf && (
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Role selector */}
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="text-[11px] font-medium px-3 py-2 outline-none cursor-pointer"
                              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
                            >
                              <option value="USER">User</option>
                              <option value="ADMIN">Doctor (Admin)</option>
                              <option value="SUPER_ADMIN">Super Admin</option>
                            </select>

                            {/* Toggle active */}
                            <button
                              onClick={() => handleToggleActive(u.id, u.isActive)}
                              className="p-2 transition-colors"
                              title={u.isActive ? "Deactivate" : "Activate"}
                              style={{
                                color: u.isActive ? "#22c55e" : "#f87171",
                                border: `1px solid ${u.isActive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                                borderRadius: 2,
                              }}
                            >
                              {u.isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="p-2 transition-colors"
                              style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 2 }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB: Quotas ─────────────────────────────── */}
        {activeTab === "quotas" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
              <h2 className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>Query Quota Configuration</h2>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>Set daily and monthly query limits per role. Users exceeding their quota will be blocked until the next period.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quotas.map((q) => {
                const info = ROLE_LABELS[q.role] || { label: q.role, color: "#888", bg: "rgba(136,136,136,0.1)" };
                return (
                  <div key={q.role} className="p-6 space-y-5 transition-all duration-200" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.06)", borderRadius: 2 }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.06)")}>
                    {/* Role badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3" style={{ background: info.color, borderRadius: 1 }} />
                      <span className="text-[12px] font-bold tracking-[0.08em] uppercase" style={{ color: info.color }}>
                        {info.label}
                      </span>
                    </div>

                    {/* Daily limit */}
                    <div>
                      <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                        Daily Query Limit
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={q.dailyQueryLimit}
                        onChange={(e) => updateQuota(q.role, "dailyQueryLimit", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 text-[14px] font-mono outline-none transition-all"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold-primary)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                      />
                    </div>

                    {/* Monthly limit */}
                    <div>
                      <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                        Monthly Query Limit
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={q.monthlyQueryLimit}
                        onChange={(e) => updateQuota(q.role, "monthlyQueryLimit", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 text-[14px] font-mono outline-none transition-all"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold-primary)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                      />
                    </div>

                    {/* File uploads */}
                    <div>
                      <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                        Max File Uploads
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={q.maxFileUploads}
                        onChange={(e) => updateQuota(q.role, "maxFileUploads", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 text-[14px] font-mono outline-none transition-all"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--gold-primary)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                      />
                    </div>

                    {/* Save */}
                    <button
                      onClick={() => handleSaveQuota(q)}
                      disabled={savingQuota === q.role}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase transition-all disabled:opacity-60"
                      style={{ background: "var(--gold-primary)", color: "#020202", borderRadius: 0 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gold-bright)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--gold-primary)")}
                    >
                      {savingQuota === q.role ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Save Changes</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── TAB: Documents & Ingestion ──────────────── */}
        {activeTab === "documents" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<MessageSquare className="w-5 h-5 animate-pulse" />}
                label="Total Queries"
                value={adminStats.totalQueries.toString()}
                color="from-blue-500 to-indigo-600"
              />
              <StatCard
                icon={<Zap className="w-5 h-5" />}
                label="Avg Response"
                value={adminStats.avgResponseMs > 0 ? `${(adminStats.avgResponseMs / 1000).toFixed(1)}s` : "—"}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Document Ingest Panel */}
              <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(201,168,76,0.06)" }}>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Document Ingestion</h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-normal">Add PDFs or Google Sheets to enrich the Siddha Knowledge base.</p>
                </div>

                {/* Upload File */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Upload Local PDF / CSV</h4>
                  <label className="flex flex-col items-center justify-center w-full h-36 border border-dashed border-white/10 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-teal-500/30 transition-all group relative">
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      {uploading ? (
                        <Loader2 className="w-7 h-7 text-teal-400 animate-spin mb-2" />
                      ) : (
                        <UploadCloud className="w-7 h-7 text-neutral-400 group-hover:text-teal-400 transition-colors mb-2" />
                      )}
                      <p className="text-xs text-neutral-400 group-hover:text-neutral-300 font-medium">
                        <span className="font-semibold text-teal-400">Click to upload</span> or drag files
                      </p>
                      <p className="text-[10px] text-neutral-600 mt-1">PDF, CSV up to 15MB</p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf,.csv" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>

                <div className="relative flex justify-center text-xs uppercase">
                  <span className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></span>
                  <span className="relative bg-[#060606] px-2 text-neutral-600 font-bold">Or</span>
                </div>

                {/* Google Sheet Sync */}
                <form onSubmit={handleSheetSubmit} className="space-y-3">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Sync Google Sheet dataset</h4>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="url"
                      placeholder="Paste Google Sheets link..."
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-teal-500/40 transition-all font-mono"
                      disabled={uploading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!sheetUrl || uploading}
                    className="w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {uploading ? "Syncing..." : "Sync Google Sheet"}
                  </button>
                </form>
              </div>

              {/* Document List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
                    Active Knowledge Documents
                  </h2>
                  <span className="text-xs text-neutral-500 font-medium">({documents.length} Total)</span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-6 h-6 text-teal-500 animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-16 text-neutral-500 bg-white/[0.01] border border-white/5 rounded-xl">
                    <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No documents in the database</p>
                    <p className="text-xs mt-1">Upload a PDF or sync a sheet to see indexed files.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {documents.map((doc) => (
                      <motion.div
                        key={doc.name}
                        className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all flex items-start justify-between gap-4"
                        style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(201,168,76,0.06)" }}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-teal-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-white truncate">{doc.name}</h3>
                            <span className="text-[10px] text-neutral-500 flex items-center gap-1 mt-1 font-mono">
                              <HardDrive className="w-3 h-3" />
                              {doc.chunkCount} chunks
                            </span>
                            {doc.sampleText && (
                              <p className="text-[11px] text-neutral-600 mt-2 line-clamp-2 leading-relaxed font-serif italic">
                                {doc.sampleText}...
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          disabled={deleting === doc.name}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all disabled:opacity-50"
                        >
                          {deleting === doc.name ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Delete
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB: Query Logs ─────────────────────────── */}
        {activeTab === "logs" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search queries & answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
                  style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(201,168,76,0.08)" }}
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
                <p className="text-lg font-medium">{searchQuery ? "No matching queries" : "No queries yet"}</p>
                <p className="text-sm mt-1">{searchQuery ? "Try a different search term" : "Chat interactions will appear here in real-time."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all"
                    style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(201,168,76,0.06)" }}
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
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(log.timestamp)}
                          </span>
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1 font-mono">
                            <Zap className="w-3.5 h-3.5 animate-pulse" />
                            {(log.durationMs / 1000).toFixed(1)}s
                          </span>
                          <span className="text-[10px] text-neutral-500 flex items-center gap-1 font-mono">
                            <FileText className="w-3.5 h-3.5" />
                            {log.sources.length} sources
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-neutral-500">
                        {expandedLog === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-sans">Requested Symptoms:</p>
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
                                } catch (e) {
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
                                    <p className="font-serif italic text-neutral-500 line-clamp-3">"{src.text}"</p>
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

        {/* ── TAB: Evaluations ────────────────────────── */}
        {activeTab === "evaluations" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
              </div>
            ) : evalRuns.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 bg-white/[0.01] border border-white/5 rounded-xl">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30 text-amber-400" />
                <p className="text-md font-medium text-white">No evaluation benchmarks run yet</p>
                <p className="text-xs mt-1 max-w-md mx-auto leading-relaxed">
                  Trigger an evaluation benchmark run to test the RAG search precision, faithfulness, and answer relevance on synthetic scenarios.
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
                  </div>
                )}

                {/* Runs History */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-white/5 pb-2">Historical Benchmark Runs</h3>
                  {evalRuns.map((run) => (
                    <div
                      key={run.id}
                      className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all text-xs"
                      style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(201,168,76,0.06)" }}
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

                            {run.details && (
                              <div>
                                <h4 className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-1">Execution Metrics Output Logs</h4>
                                <pre className="bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-[10px] text-neutral-400 leading-relaxed overflow-x-auto max-h-52 whitespace-pre-wrap">
                                  {typeof run.details === "string" ? run.details : JSON.stringify(run.details, null, 2)}
                                </pre>
                              </div>
                            )}
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
      </main>
    </div>
  );
}

// ── Stat Card Component ────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all"
      style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(201,168,76,0.06)" }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center opacity-85 shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">{label}</p>
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
    }`}
      style={{
        background: highlighted ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.01)",
        borderColor: highlighted ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.06)"
      }}
    >
      <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">{label}</span>
      <p className="text-2xl font-bold font-mono mt-1" style={{ color: highlighted ? "var(--gold-primary)" : "var(--text-primary)" }}>{percentage}%</p>
      
      {/* Visual meter bar */}
      <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-3 max-w-[80px] mx-auto">
        <div 
          className="h-full"
          style={{
            width: `${percentage}%`,
            background: highlighted ? "var(--gold-primary)" : "#22c55e"
          }}
        />
      </div>
    </div>
  );
}
