"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Settings, BarChart3, Shield,
  UserCheck, UserX, ChevronDown, ChevronUp,
  RefreshCw, Loader2,
  Trash2, Activity, Gauge, Save, Database,
  MessageSquare, FileText, Clock, Zap, HardDrive,
  Search, UploadCloud,
  Sparkles, CheckCircle2, CreditCard, AlertTriangle
} from "lucide-react";
import Image from "next/image";
import type { PublicPricingPlan } from "@/lib/billing/pricing";
import { DashboardShell } from "@/components/product/DashboardShell";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  planSlug: string;
  isActive: boolean;
  createdAt: string;
  totalQueries: number;
  totalSessions: number;
  tokens?: {
    monthlyTokenLimit: number;
    monthlyTokenAdjustment: number;
    monthlyTokensUsed: number;
    monthlyTokensRemaining: number;
  };
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  totalQueries: number;
  todayQueries: number;
  revenue?: {
    paidAmountMinor: number;
    pendingAmountMinor: number;
    paidTransactions: number;
    estimatedAiCostMinor: number;
    estimatedGrossProfitMinor: number;
    averageCostPerAnswerMinor: number;
    totalTokens: number;
    byPlan: Array<{
      planSlug: string;
      paidAmountMinor: number;
      estimatedAiCostMinor: number;
      estimatedGrossProfitMinor: number;
      paidTransactions: number;
      answers: number;
      tokens: number;
    }>;
  };
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

interface AgentSettings {
  agentName: string;
  agentSubtitle: string;
  profileImageUrl: "/bot-profile.png";
  welcomeMessage: string;
  inputPlaceholder: string;
  disclaimer: string;
  followUpQuestionsEnabled: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
}

interface HealthData {
  dbHealth: "healthy" | "unhealthy" | string;
  redisHealth: "healthy" | "unhealthy" | string;
  queueStats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountPercent: number;
  applicablePlanSlugs: string[];
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

const EMPTY_PROMO_CODE: Omit<PromoCode, "id" | "usedCount"> = {
  code: "",
  description: "",
  discountPercent: 10,
  applicablePlanSlugs: [],
  maxUses: null,
  expiresAt: null,
  isActive: true,
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
  followUpQuestionsEnabled: true,
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}

function normalizeAgentSettings(settings: Partial<AgentSettings> | null | undefined): AgentSettings {
  return {
    agentName: settings?.agentName || DEFAULT_AGENT_SETTINGS.agentName,
    agentSubtitle: settings?.agentSubtitle || DEFAULT_AGENT_SETTINGS.agentSubtitle,
    profileImageUrl: "/bot-profile.png",
    welcomeMessage: settings?.welcomeMessage || DEFAULT_AGENT_SETTINGS.welcomeMessage,
    inputPlaceholder: settings?.inputPlaceholder || DEFAULT_AGENT_SETTINGS.inputPlaceholder,
    disclaimer: settings?.disclaimer || DEFAULT_AGENT_SETTINGS.disclaimer,
    followUpQuestionsEnabled: settings?.followUpQuestionsEnabled ?? DEFAULT_AGENT_SETTINGS.followUpQuestionsEnabled,
  };
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  ADMIN: { label: "Doctor", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  USER: { label: "User", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
};

export default function SuperAdminPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "users" | "pricing" | "agent" | "documents" | "logs" | "evaluations" | "health"
  >("overview");
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS);
  const [savingAgentSettings, setSavingAgentSettings] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PublicPricingPlan[]>([]);
  const [savingPricingPlan, setSavingPricingPlan] = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoDraft, setPromoDraft] = useState(EMPTY_PROMO_CODE);
  const [savingPromoCode, setSavingPromoCode] = useState(false);

  // Admin-specific states
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [ingestionJobs, setIngestionJobs] = useState<IngestionJobRow[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvaluationRun[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats>({ totalQueries: 0, avgResponseMs: 0, uniqueSourceFiles: 0 });
  const [totalChunks, setTotalChunks] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [expandedEval, setExpandedEval] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingSource, setUpdatingSource] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationStartedAt, setEvaluationStartedAt] = useState<number | null>(null);
  const [evaluationElapsedMs, setEvaluationElapsedMs] = useState(0);
  const [evaluationEngine, setEvaluationEngine] = useState<EvaluationEngineSnapshot | null>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [tokenDrafts, setTokenDrafts] = useState<Record<string, { amount: string; reason: string }>>({});

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check auth and role
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
        if (data.user.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        if (data.user.role !== "SUPER_ADMIN") {
          router.replace("/chat");
          return;
        }
        setCurrentUser(data.user);
      } catch {
        showToast("Unable to verify your session. Please refresh once.", "error");
      }
    })();
  }, [router]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/super-admin/users");
    const data = await res.json();
    if (res.ok) setUsers(data.users || []);
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

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/health");
      if (res.ok) setHealthData(await res.json());
    } catch (e) {
      console.error("Failed to fetch health data:", e);
    }
  }, []);

  const fetchAgentSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/agent-settings");
      const data = await res.json();
      if (res.ok && data.settings) setAgentSettings(normalizeAgentSettings(data.settings));
    } catch (e) {
      console.error("Failed to fetch agent settings:", e);
    }
  }, []);

  const fetchPricingPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/pricing");
      const data = await res.json();
      if (res.ok) setPricingPlans(data.plans || []);
    } catch (e) {
      console.error("Failed to fetch pricing plans:", e);
    }
  }, []);

  const fetchPromoCodes = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/promo-codes");
      const data = await res.json();
      if (res.ok) setPromoCodes(data.promoCodes || []);
    } catch (e) {
      console.error("Failed to fetch promo codes:", e);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    if (activeTab === "overview" || activeTab === "users") {
      await Promise.all([fetchUsers(), fetchStats(), fetchPricingPlans()]);
    } else if (activeTab === "pricing") {
      await Promise.all([fetchPricingPlans(), fetchPromoCodes()]);
    } else if (activeTab === "agent") {
      await fetchAgentSettings();
    } else if (activeTab === "documents") {
      await fetchDocuments();
    } else if (activeTab === "logs") {
      await fetchLogs();
    } else if (activeTab === "evaluations") {
      await fetchEvaluations();
    } else if (activeTab === "health") {
      await fetchHealth();
    }
    setLoading(false);
  }, [activeTab, fetchUsers, fetchStats, fetchPricingPlans, fetchPromoCodes, fetchAgentSettings, fetchDocuments, fetchLogs, fetchEvaluations, fetchHealth]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadAll();
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser, activeTab, loadAll]);

  useEffect(() => {
    if (!evaluating || !evaluationStartedAt) return;

    const interval = setInterval(() => {
      setEvaluationElapsedMs(Date.now() - evaluationStartedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [evaluating, evaluationStartedAt]);

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
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to update role", "error");
    }
  };

  const handlePlanChange = async (userId: string, planSlug: string) => {
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("User plan updated", "success");
      await fetchUsers();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to update user plan", "error");
    }
  };

  const handleTokenAdjustment = async (userId: string) => {
    const draft = tokenDrafts[userId] || { amount: "", reason: "" };
    const amount = Number(draft.amount);
    if (!Number.isInteger(amount) || amount === 0) {
      showToast("Enter a non-zero whole-number token adjustment", "error");
      return;
    }
    if (draft.reason.trim().length < 3) {
      showToast("Add a short reason for the token change", "error");
      return;
    }

    try {
      const res = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          tokenAdjustment: {
            amount,
            reason: draft.reason.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTokenDrafts((current) => ({ ...current, [userId]: { amount: "", reason: "" } }));
      showToast("Tokens adjusted for this month", "success");
      await fetchUsers();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to adjust tokens", "error");
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
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to update account status", "error");
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
    } catch (e: unknown) {
      showToast(getErrorMessage(e, "Failed to delete user"), "error");
    }
  };

  // Update password
  const handleUpdatePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 12 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      showToast("Use 12+ characters with uppercase, lowercase, a number, and a symbol", "error");
      return;
    }
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Password updated successfully", "success");
      setResettingPasswordId(null);
      setNewPassword("");
    } catch (e: unknown) {
      showToast(getErrorMessage(e, "Failed to update password"), "error");
    }
  };

  const handleSaveAgentSettings = async () => {
    setSavingAgentSettings(true);
    try {
      const res = await fetch("/api/agent-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save agent profile");
      setAgentSettings(normalizeAgentSettings(data.settings));
      showToast("Agent profile updated", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to save agent profile", "error");
    } finally {
      setSavingAgentSettings(false);
    }
  };

  const updateAgentSetting = <K extends keyof AgentSettings>(field: K, value: AgentSettings[K]) => {
    setAgentSettings((current) => ({ ...current, [field]: value }));
  };

  const updatePricingPlan = (slug: string, updates: Partial<PublicPricingPlan>) => {
    setPricingPlans((current) =>
      current.map((plan) => plan.slug === slug ? { ...plan, ...updates } : plan)
    );
  };

  const handleSavePricingPlan = async (plan: PublicPricingPlan) => {
    setSavingPricingPlan(plan.slug);
    try {
      const closedKnowledgePlan = { ...plan, maxFileUploads: 0 };
      const res = await fetch("/api/super-admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(closedKnowledgePlan),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save pricing plan");
      updatePricingPlan(plan.slug, data.plan);
      showToast(`${plan.name} pricing updated`, "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to save pricing plan", "error");
    } finally {
      setSavingPricingPlan(null);
    }
  };

  const handleSavePromoCode = async () => {
    const code = promoDraft.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) {
      showToast("Use 2-40 letters, numbers, hyphens, or underscores for the promo code", "error");
      return;
    }
    if (promoDraft.discountPercent < 1 || promoDraft.discountPercent > 100) {
      showToast("Discount must be between 1% and 100%", "error");
      return;
    }

    setSavingPromoCode(true);
    try {
      const res = await fetch("/api/super-admin/promo-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...promoDraft,
          code,
          description: promoDraft.description.trim() || "Promotional discount",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save promo code");
      setPromoDraft(EMPTY_PROMO_CODE);
      showToast("Promo code saved", "success");
      await fetchPromoCodes();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to save promo code", "error");
    } finally {
      setSavingPromoCode(false);
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    const res = await fetch("/api/super-admin/promo-codes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showToast("Promo code deleted", "success");
      await fetchPromoCodes();
    } else {
      showToast("Failed to delete promo code", "error");
    }
  };

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
        setAdminStats({ totalQueries: 0, avgResponseMs: 0, uniqueSourceFiles: 0 });
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

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060606" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gold-primary)" }} />
      </div>
    );
  }

  return (
    <DashboardShell
      role="Super Admin"
      eyebrow="Platform Command"
      title="Super Admin Console"
      description="Operate the platform, govern access, shape plans, and monitor the assistant from one workspace."
      email={currentUser.email}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={loadAll}
      refreshing={loading}
      onLogout={handleLogout}
      accent="gold"
      enableThemeToggle
      navItems={[
        { id: "overview", label: "Overview", description: "Platform pulse", icon: <BarChart3 size={15} /> },
        { id: "analytics", label: "Analytics", description: "Search and engagement trends", icon: <Gauge size={15} /> },
        { id: "users", label: "Users & Roles", description: "Access and plan assignment", icon: <Users size={15} />, count: users.length },
        { id: "pricing", label: "Plans & Payments", description: "Limits, pricing, promo codes", icon: <CreditCard size={15} /> },
        { id: "agent", label: "Agent Profile", description: "Identity and chat copy", icon: <Settings size={15} /> },
        { id: "documents", label: "Knowledge Base", description: "Curated source controls", icon: <Database size={15} />, count: documents.length },
        { id: "logs", label: "Query Logs", description: "Assistant activity", icon: <MessageSquare size={15} />, count: logs.length },
        { id: "evaluations", label: "Ragas Evaluations", description: "Quality benchmarks", icon: <Sparkles size={15} />, count: evalRuns.length },
        { id: "health", label: "Maintenance & Health", description: "Services and queue health", icon: <Activity size={15} /> },
      ]}
    >
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

        {activeTab === "analytics" && <AnalyticsDashboard />}

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
                <div key={s.label} className="p-5 transition-all duration-200" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-active)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--dashboard-border)")}>
                  <div className="flex items-center gap-2 mb-3" style={{ color: "var(--gold-dim)" }}>
                    {s.icon}
                    <span className="text-[10px] font-semibold tracking-[0.12em] uppercase">{s.label}</span>
                  </div>
                  <div className="text-[32px] font-black" style={{ color: "var(--gold-primary)" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {stats.revenue && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                {[
                  { label: "Paid Revenue", value: formatMinor(stats.revenue.paidAmountMinor, "INR") },
                  { label: "Pending Revenue", value: formatMinor(stats.revenue.pendingAmountMinor, "INR") },
                  { label: "AI Cost", value: formatMinor(Math.round(stats.revenue.estimatedAiCostMinor), "INR") },
                  { label: "Gross Profit", value: formatMinor(Math.round(stats.revenue.estimatedGrossProfitMinor), "INR") },
                ].map((metric) => (
                  <div key={metric.label} className="p-5" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>{metric.label}</p>
                    <p className="mt-2 text-[24px] font-black" style={{ color: "var(--gold-primary)" }}>{metric.value}</p>
                  </div>
                ))}
              </div>
            )}

            {stats.revenue?.byPlan?.length ? (
              <div className="p-6" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
                <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--text-tertiary)" }}>Plan Profitability</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {stats.revenue.byPlan.map((plan) => (
                    <div key={plan.planSlug} className="border p-4" style={{ borderColor: "var(--border-subtle)", borderRadius: 8 }}>
                      <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>{plan.planSlug}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        <span>Revenue <strong style={{ color: "var(--gold-primary)" }}>{formatMinor(plan.paidAmountMinor, "INR")}</strong></span>
                        <span>AI cost <strong style={{ color: "var(--text-primary)" }}>{formatMinor(Math.round(plan.estimatedAiCostMinor), "INR")}</strong></span>
                        <span>Profit <strong style={{ color: "var(--gold-primary)" }}>{formatMinor(Math.round(plan.estimatedGrossProfitMinor), "INR")}</strong></span>
                        <span>Answers <strong style={{ color: "var(--text-primary)" }}>{plan.answers}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Role distribution */}
            <div className="p-6" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
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
                        background: "var(--dashboard-card)",
                        border: `1px solid ${isSelf ? "var(--border-active)" : "var(--dashboard-border)"}`,
                        borderRadius: 12,
                        opacity: u.isActive ? 1 : 0.5,
                      }}
                    >
                      <div className="flex flex-col items-start justify-between gap-4 xl:flex-row xl:gap-6">
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
                          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Plan: <strong style={{ color: "var(--gold-primary)" }}>{pricingPlans.find((plan) => plan.slug === u.planSlug)?.name || u.planSlug}</strong></span>
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Tokens used: <strong style={{ color: "var(--gold-primary)" }}>{u.tokens?.monthlyTokensUsed.toLocaleString("en-IN") ?? "—"}</strong></span>
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Tokens left: <strong style={{ color: "var(--gold-primary)" }}>{u.tokens?.monthlyTokensRemaining.toLocaleString("en-IN") ?? "—"}</strong></span>
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Manual adj: <strong style={{ color: "var(--text-primary)" }}>{u.tokens?.monthlyTokenAdjustment.toLocaleString("en-IN") ?? 0}</strong></span>
                            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Total chats: <strong style={{ color: "var(--text-primary)" }}>{u.totalQueries}</strong></span>
                          </div>
                        </div>

                        {/* Actions */}
                        {!isSelf && (
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <select
                              value={u.planSlug}
                              onChange={(e) => handlePlanChange(u.id, e.target.value)}
                              className="text-[11px] font-medium px-3 py-2 outline-none cursor-pointer"
                              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
                            >
                              {pricingPlans.map((plan) => <option key={plan.slug} value={plan.slug}>{plan.name}</option>)}
                            </select>

                            <input
                              type="number"
                              placeholder="+/- tokens"
                              value={tokenDrafts[u.id]?.amount || ""}
                              onChange={(e) => setTokenDrafts((current) => ({ ...current, [u.id]: { amount: e.target.value, reason: current[u.id]?.reason || "" } }))}
                              className="w-24 px-2 py-2 text-[11px] outline-none"
                              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
                            />
                            <input
                              type="text"
                              placeholder="Reason"
                              value={tokenDrafts[u.id]?.reason || ""}
                              onChange={(e) => setTokenDrafts((current) => ({ ...current, [u.id]: { amount: current[u.id]?.amount || "", reason: e.target.value } }))}
                              className="w-32 px-2 py-2 text-[11px] outline-none"
                              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
                            />
                            <button
                              onClick={() => handleTokenAdjustment(u.id)}
                              className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em]"
                              style={{ color: "var(--gold-primary)", border: "1px solid rgba(201,168,76,0.28)", borderRadius: 2 }}
                            >
                              Adjust
                            </button>

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

                            {/* Password Reset */}
                            {resettingPasswordId === u.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="New pwd..."
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  className="text-[11px] px-2 py-1 outline-none w-24 h-8"
                                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
                                />
                                <button onClick={() => handleUpdatePassword(u.id)} className="w-8 h-8 flex items-center justify-center transition-colors" style={{ color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 2 }}>
                                  <CheckCircle2 size={14} />
                                </button>
                                <button onClick={() => { setResettingPasswordId(null); setNewPassword(""); }} className="w-8 h-8 flex items-center justify-center transition-colors" style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 2 }}>
                                  <UserX size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setResettingPasswordId(u.id)}
                                className="p-2 transition-colors"
                                title="Reset Password"
                                style={{ color: "var(--gold-primary)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 2 }}
                              >
                                <Settings size={14} />
                              </button>
                            )}

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

        {/* ── TAB: Pricing & Payments ─────────────────── */}
        {activeTab === "pricing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
              <h2 className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>Plans, Limits & Payment Configuration</h2>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>Closed-knowledge subscription plans for the existing Siddha resource base. Each plan controls public pricing, enforced monthly token limits, features, and secure provider handoff URL.</p>
            </div>

            <div className="space-y-5">
              {pricingPlans.map((plan) => (
                <div key={plan.slug} className="p-6 space-y-5" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{plan.name}</h3>
                      <p className="mt-1 text-[11px] font-mono" style={{ color: "var(--gold-dim)" }}>/{plan.slug}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-3" style={{ color: "var(--text-secondary)" }}>
                      <span className="border px-3 py-2" style={{ borderColor: "var(--border-subtle)" }}>{formatMinor(plan.monthlyPriceMinor, plan.currency)} / month</span>
                      <span className="border px-3 py-2" style={{ borderColor: "var(--border-subtle)" }}>{formatMinor(plan.yearlyPriceMinor, plan.currency)} / year</span>
                      <span className="border px-3 py-2" style={{ borderColor: "var(--border-subtle)" }}>{plan.monthlyTokenLimit.toLocaleString("en-IN")} monthly tokens</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      <PricingCheckbox label="Published" checked={plan.isPublished} onChange={(checked) => updatePricingPlan(plan.slug, { isPublished: checked })} />
                      <PricingCheckbox label="Popular" checked={plan.isPopular} onChange={(checked) => updatePricingPlan(plan.slug, { isPopular: checked })} />
                      <PricingCheckbox label="Free plan" checked={plan.isFree} onChange={(checked) => updatePricingPlan(plan.slug, { isFree: checked })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <PricingField label="Plan Name" value={plan.name} onChange={(value) => updatePricingPlan(plan.slug, { name: value })} />
                    <PricingField label="Currency" value={plan.currency} onChange={(value) => updatePricingPlan(plan.slug, { currency: value })} />
                    <PricingField label="Monthly Price (minor unit)" type="number" value={plan.monthlyPriceMinor} onChange={(value) => updatePricingPlan(plan.slug, { monthlyPriceMinor: Number(value) || 0 })} />
                    <PricingField label="Yearly Price (minor unit)" type="number" value={plan.yearlyPriceMinor} onChange={(value) => updatePricingPlan(plan.slug, { yearlyPriceMinor: Number(value) || 0 })} />
                    <PricingField label="Monthly Tokens" type="number" value={plan.monthlyTokenLimit} onChange={(value) => updatePricingPlan(plan.slug, { monthlyTokenLimit: Number(value) || 0 })} />
                    <PricingField label="Display Order" type="number" value={plan.displayOrder} onChange={(value) => updatePricingPlan(plan.slug, { displayOrder: Number(value) || 0 })} />
                  </div>

                  <PricingField label="Description" value={plan.description} onChange={(value) => updatePricingPlan(plan.slug, { description: value })} />
                  <PricingField label="HTTPS Payment Provider URL" value={plan.checkoutUrl || ""} placeholder="https://provider.example/checkout/..." onChange={(value) => updatePricingPlan(plan.slug, { checkoutUrl: value || null })} />
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>Features (one per line)</span>
                    <textarea
                      rows={4}
                      value={plan.features.join("\n")}
                      onChange={(event) => updatePricingPlan(plan.slug, { features: event.target.value.split("\n").filter(Boolean) })}
                      className="w-full resize-y px-3 py-2.5 text-[12px] leading-relaxed outline-none"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
                    />
                  </label>
                  <button
                    onClick={() => handleSavePricingPlan(plan)}
                    disabled={savingPricingPlan === plan.slug}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] disabled:opacity-60"
                    style={{ background: "var(--gold-primary)", color: "#020202" }}
                  >
                    {savingPricingPlan === plan.slug ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save {plan.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6 space-y-5" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
              <div>
                <h3 className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>Promo Codes</h3>
                <p className="mt-1 text-[12px]" style={{ color: "var(--text-tertiary)" }}>Create purchase-time discounts. An empty applicable-plan list means the code works with every paid plan.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <PricingField label="Code" value={promoDraft.code} onChange={(value) => setPromoDraft((current) => ({ ...current, code: value.toUpperCase() }))} />
                <PricingField label="Description (optional)" value={promoDraft.description} placeholder="Promotional discount" onChange={(value) => setPromoDraft((current) => ({ ...current, description: value }))} />
                <PricingField label="Discount %" type="number" value={promoDraft.discountPercent} onChange={(value) => setPromoDraft((current) => ({ ...current, discountPercent: Number(value) || 0 }))} />
                <PricingField label="Max Uses (blank = unlimited)" type="number" value={promoDraft.maxUses ?? ""} onChange={(value) => setPromoDraft((current) => ({ ...current, maxUses: value ? Number(value) : null }))} />
              </div>
              <div className="flex flex-wrap gap-4 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {pricingPlans.map((plan) => (
                  <PricingCheckbox
                    key={plan.slug}
                    label={plan.name}
                    checked={promoDraft.applicablePlanSlugs.includes(plan.slug)}
                    onChange={(checked) => setPromoDraft((current) => ({
                      ...current,
                      applicablePlanSlugs: checked
                        ? [...current.applicablePlanSlugs, plan.slug]
                        : current.applicablePlanSlugs.filter((slug) => slug !== plan.slug),
                    }))}
                  />
                ))}
                <PricingCheckbox label="Active" checked={promoDraft.isActive} onChange={(checked) => setPromoDraft((current) => ({ ...current, isActive: checked }))} />
              </div>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Only the code and discount are required. Leave plans unchecked to apply the promo to every paid plan.</p>
              <button onClick={handleSavePromoCode} disabled={savingPromoCode || promoDraft.code.trim().length < 2} className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] disabled:opacity-60" style={{ background: "var(--gold-primary)", color: "#020202" }}>
                {savingPromoCode ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Promo Code
              </button>
              <div className="space-y-2">
                {promoCodes.map((promo) => (
                  <div key={promo.id} className="flex flex-wrap items-center justify-between gap-3 border p-3 text-[12px]" style={{ borderColor: "var(--border-subtle)" }}>
                    <span style={{ color: "var(--text-primary)" }}><strong>{promo.code}</strong> · {promo.discountPercent}% off · {promo.description}</span>
                    <button onClick={() => handleDeletePromoCode(promo.id)} className="text-red-400"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB: Agent Profile ───────────────────────── */}
        {activeTab === "agent" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
              <h2 className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>Agent Profile Customization</h2>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>Control the bot identity shown to users. Clinical safety instructions remain protected in code.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              <div className="p-6 space-y-4" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: "var(--text-tertiary)" }}>Live Preview</p>
                <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-full" style={{ border: "1px solid rgba(201,168,76,0.24)" }}>
                  <Image src={agentSettings.profileImageUrl} alt={`${agentSettings.agentName} profile`} fill sizes="128px" className="object-cover" />
                </div>
                <div className="text-center">
                  <p className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>{agentSettings.agentName}</p>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>{agentSettings.agentSubtitle}</p>
                </div>
                <p className="text-center text-[10px]" style={{ color: "var(--gold-dim)" }}>Profile image: /bot-profile.png</p>
              </div>

              <div className="p-6 space-y-5" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <AgentTextField label="Agent Name" value={agentSettings.agentName} maxLength={80} onChange={(value) => updateAgentSetting("agentName", value)} />
                  <AgentTextField label="Subtitle" value={agentSettings.agentSubtitle} maxLength={120} onChange={(value) => updateAgentSetting("agentSubtitle", value)} />
                </div>
                <AgentTextField label="Composer Placeholder" value={agentSettings.inputPlaceholder} maxLength={160} onChange={(value) => updateAgentSetting("inputPlaceholder", value)} />
                <div className="flex items-center justify-between gap-4 p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-primary)" }}>Follow-up Questions</p>
                    <p className="mt-1 text-[11px] leading-5" style={{ color: "var(--text-tertiary)" }}>
                      When enabled, the bot asks 2-4 clarifying symptom questions before final answers. Turn off to answer directly.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Toggle follow-up questions"
                    aria-checked={agentSettings.followUpQuestionsEnabled}
                    onClick={() => updateAgentSetting("followUpQuestionsEnabled", !agentSettings.followUpQuestionsEnabled)}
                    className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
                    style={{ background: agentSettings.followUpQuestionsEnabled ? "var(--gold-primary)" : "rgba(148,163,184,0.28)" }}
                  >
                    <span
                      className="absolute left-1 top-1 h-5 w-5 rounded-full bg-black transition-transform"
                      style={{ transform: agentSettings.followUpQuestionsEnabled ? "translateX(20px)" : "translateX(0)" }}
                    />
                  </button>
                </div>
                <AgentTextarea label="Welcome Message" value={agentSettings.welcomeMessage} maxLength={2000} rows={7} onChange={(value) => updateAgentSetting("welcomeMessage", value)} />
                <AgentTextarea label="Medical Disclaimer" value={agentSettings.disclaimer} maxLength={500} rows={3} onChange={(value) => updateAgentSetting("disclaimer", value)} />
                <button
                  onClick={handleSaveAgentSettings}
                  disabled={savingAgentSettings}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase transition-all disabled:opacity-60"
                  style={{ background: "var(--gold-primary)", color: "#020202" }}
                >
                  {savingAgentSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Agent Profile
                </button>
              </div>
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
                label="Active Chunks"
                value={activeChunks.toString()}
                color="from-teal-500 to-emerald-600"
              />
              <StatCard
                icon={<FileText className="w-5 h-5" />}
                label="Inactive Sources"
                value={inactiveDocuments.length.toString()}
                color="from-purple-500 to-pink-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)" }}>
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
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Add Internal Resource</h4>
                  <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-center transition hover:border-teal-500/30 hover:bg-white/10">
                    {uploading ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-teal-400" /> : <UploadCloud className="mb-2 h-6 w-6 text-teal-400" />}
                    <span className="text-xs font-bold text-neutral-300">Add PDF, CSV, or XLSX</span>
                    <span className="mt-1 text-[10px] text-neutral-600">Admin-only corpus indexing</span>
                    <input type="file" className="hidden" accept=".pdf,.csv,.xlsx" onChange={handleFileUpload} disabled={uploading} multiple />
                  </label>
                </div>
                <form onSubmit={handleSheetSubmit} className="space-y-3 rounded-xl border border-white/5 bg-black/20 p-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Sync Sheet Resource</h4>
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
                  <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
                    Curated Knowledge Sources
                  </h2>
                  <span className="text-xs text-neutral-500 font-medium">({documents.length} Total)</span>
                </div>

                {ingestionJobs.some((job) => job.status !== "COMPLETED") && (
                  <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Ingestion status</p>
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
                        style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)" }}
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
                              <p className="text-[11px] text-neutral-600 mt-2 line-clamp-2 leading-relaxed font-serif italic">
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

        {/* ── TAB: Query Logs ─────────────────────────── */}
        {activeTab === "logs" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search questions & answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
                  style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)" }}
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
                <p className="text-lg font-medium">{searchQuery ? "No matching questions" : "No questions yet"}</p>
                <p className="text-sm mt-1">{searchQuery ? "Try a different search term" : "Chat interactions will appear here in real-time."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all"
                    style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)" }}
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
                      style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)" }}
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

                            {Boolean(run.details) && (
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
        {/* ── TAB: Health & Maintenance ────────────────── */}
        {activeTab === "health" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>System Health & Maintenance</h2>
                <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>Real-time monitoring of database, redis, and background queues.</p>
              </div>
              <button onClick={fetchHealth} className="flex items-center gap-2 px-4 py-2 text-[11px] font-semibold transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 2 }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loading || !healthData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--gold-primary)" }} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* DB Status */}
                <div className="p-6 transition-all duration-200" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <Database size={18} style={{ color: "var(--gold-dim)" }} />
                    <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase">Postgres Database</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: healthData.dbHealth === "healthy" ? "#22c55e" : "#f87171" }} />
                    <span className="text-xl font-bold uppercase">{healthData.dbHealth}</span>
                  </div>
                </div>

                {/* Redis Status */}
                <div className="p-6 transition-all duration-200" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <Activity size={18} style={{ color: "var(--gold-dim)" }} />
                    <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase">Upstash Redis</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: healthData.redisHealth === "healthy" ? "#22c55e" : "#f87171" }} />
                    <span className="text-xl font-bold uppercase">{healthData.redisHealth}</span>
                  </div>
                </div>

                {/* Queue Stats */}
                <div className="p-6 transition-all duration-200 lg:col-span-3" style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)", borderRadius: 12 }}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <BarChart3 size={18} style={{ color: "var(--gold-dim)" }} />
                      <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase">BullMQ Ingestion Queue</h3>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await fetch("/api/super-admin/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clean_failed_jobs" }) });
                          showToast("Failed jobs cleaned", "success");
                          fetchHealth();
                        } catch {
                          showToast("Failed to clean jobs", "error");
                        }
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase transition-all hover:bg-red-500/20"
                      style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 2 }}>
                      Clear Failed
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-white/5 rounded">
                      <span className="text-[10px] uppercase tracking-widest text-neutral-400">Waiting</span>
                      <p className="text-2xl font-mono mt-1 text-white">{healthData.queueStats.waiting}</p>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded">
                      <span className="text-[10px] uppercase tracking-widest text-neutral-400">Active</span>
                      <p className="text-2xl font-mono mt-1 text-blue-400">{healthData.queueStats.active}</p>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded">
                      <span className="text-[10px] uppercase tracking-widest text-neutral-400">Completed</span>
                      <p className="text-2xl font-mono mt-1 text-green-400">{healthData.queueStats.completed}</p>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded">
                      <span className="text-[10px] uppercase tracking-widest text-neutral-400">Failed</span>
                      <p className="text-2xl font-mono mt-1 text-red-400">{healthData.queueStats.failed}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
    </DashboardShell>
  );
}

function PricingField({
  label,
  value,
  type = "text",
  placeholder,
  onChange,
}: {
  label: string;
  value: string | number;
  type?: "text" | "number";
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2.5 text-[12px] outline-none"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
      />
    </label>
  );
}

function PricingCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function AgentTextField({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2.5 text-[13px] outline-none transition-all"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
      />
    </label>
  );
}

function AgentTextarea({
  label,
  value,
  maxLength,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <textarea
        value={value}
        maxLength={maxLength}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-all"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderRadius: 2 }}
      />
      <span className="mt-1 block text-right text-[10px]" style={{ color: "var(--text-tertiary)" }}>{value.length}/{maxLength}</span>
    </label>
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
    <div
      className="p-4"
      style={{
        background: evaluating ? "rgba(245,158,11,0.08)" : "var(--dashboard-card)",
        border: evaluating ? "1px solid rgba(245,158,11,0.25)" : "1px solid var(--dashboard-border)",
        borderRadius: 12,
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
            {evaluating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
              {evaluating ? "Active RAG Evaluation Running" : "Active RAG Evaluation Ready"}
            </p>
            <p className="mt-1 text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {evaluating ? phase.label : `${totalPlannedCases} planned checks against the active knowledge base`}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              {evaluating
                ? phase.hint
                : "Benchmark uses current chunks, retrieval/reranking, answer generation, verification, and LLM-as-judge scoring."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
          <EngineSignal icon={<HardDrive className="h-3.5 w-3.5" />} label="Chunks" value={activeChunks.toLocaleString()} tone={activeChunks > 0 ? "good" : "warn"} />
          <EngineSignal icon={<FileText className="h-3.5 w-3.5" />} label="Sources" value={sourceDocuments.toLocaleString()} tone={sourceDocuments > 0 ? "good" : "warn"} />
          <EngineSignal icon={<Search className="h-3.5 w-3.5" />} label="Cases" value={totalPlannedCases.toLocaleString()} tone="good" />
          <EngineSignal icon={<Clock className="h-3.5 w-3.5" />} label={evaluating ? "Elapsed" : "Last Run"} value={evaluating ? formatDuration(elapsedMs) : formatLatestEvaluationRun(engine)} tone={evaluating ? "warn" : "good"} />
        </div>
      </div>

      {(evaluating || hasActiveIngestion) && (
        <div className="mt-4 border-t border-white/5 pt-4">
          {evaluating && (
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
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
  icon: ReactNode;
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
      <p className="truncate font-mono text-sm font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
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

function formatLatestEvaluationRun(engine: EvaluationEngineSnapshot | null) {
  if (!engine?.latestRun) return "None";
  return `${(engine.latestRun.overallScore * 100).toFixed(1)}%`;
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
      style={{ background: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)" }}
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
        background: highlighted ? "var(--gold-glow)" : "var(--dashboard-card)",
        borderColor: highlighted ? "var(--border-active)" : "var(--dashboard-border)"
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
