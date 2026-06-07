"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, Clock3, FileSearch, Loader2,
  MessageSquare, RefreshCw, Search, ShieldAlert, TrendingDown, TrendingUp,
  UserRound, UsersRound,
} from "lucide-react";
import type { AnalyticsResponse } from "@/lib/observability/analytics";

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/analytics");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load analytics");
      setAnalytics(data);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAnalytics]);

  if (loading && !analytics) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-300">
        <div className="flex items-center gap-2 font-bold">
          <AlertTriangle className="h-4 w-4" />
          Analytics could not be loaded
        </div>
        <p className="mt-2 text-xs opacity-80">{error}</p>
        <button type="button" onClick={loadAnalytics} className="mt-4 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }

  const { summary } = analytics;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Search & Interaction Analytics
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Understand user demand, engagement patterns, retrieval usage, and assistant performance over the last {analytics.windowDays} days.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAnalytics}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-neutral-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Analytics
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <AnalyticsMetric icon={<MessageSquare />} label="All Queries" value={summary.totalQueries.toLocaleString()} hint={`${summary.queriesToday} today`} />
        <AnalyticsMetric icon={<Activity />} label="Last 7 Days" value={summary.queriesLast7Days.toLocaleString()} hint={<GrowthLabel value={summary.queryGrowthPercent} />} />
        <AnalyticsMetric icon={<UsersRound />} label="Active Users" value={summary.activeUsers.toLocaleString()} hint={`${summary.sessions} sessions`} />
        <AnalyticsMetric icon={<Clock3 />} label="Avg Response" value={formatLatency(summary.averageResponseMs)} hint={`Peak ${summary.peakHourLabel}`} />
        <AnalyticsMetric icon={<ShieldAlert />} label="Triage Cases" value={summary.triageInteractions.toLocaleString()} hint={`${formatPercent(summary.triageRate)} of interactions`} />
        <AnalyticsMetric icon={<Search />} label="Search Terms" value={analytics.topKeywords.length.toLocaleString()} hint="top ranked keywords" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <AnalyticsPanel title="Interaction Trend" subtitle="Daily assistant queries" icon={<Activity className="h-4 w-4" />}>
          <InteractionChart values={analytics.dailyInteractions} />
        </AnalyticsPanel>
        <AnalyticsPanel title="Most Searched Keywords" subtitle="Common user intent terms" icon={<Search className="h-4 w-4" />}>
          <RankedBars values={analytics.topKeywords.map((item) => ({ label: item.keyword, value: item.count }))} empty="No keyword data yet" />
        </AnalyticsPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AnalyticsPanel title="Frequently Asked Questions" subtitle="Repeated searches and user demand" icon={<MessageSquare className="h-4 w-4" />}>
          <RankedList values={analytics.topQuestions.map((item) => ({ label: item.query, value: item.count, suffix: "searches" }))} empty="No question data yet" />
        </AnalyticsPanel>
        <AnalyticsPanel title="Referenced Knowledge Sources" subtitle="Documents surfaced in assistant answers" icon={<FileSearch className="h-4 w-4" />}>
          <RankedList values={analytics.topSources.map((item) => ({ label: item.source, value: item.count, suffix: "references" }))} empty="No source references yet" />
        </AnalyticsPanel>
      </div>

      {analytics.topUsers && (
        <AnalyticsPanel title="Most Active Users" subtitle="Visible only to Super Admin" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {analytics.topUsers.length === 0 ? (
              <EmptyState label="No user activity yet" />
            ) : analytics.topUsers.map((user) => (
              <div key={user.email} className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
                <p className="truncate text-sm font-bold text-white">{user.label}</p>
                <p className="mt-1 truncate text-[10px] text-neutral-500">{user.email}</p>
                <div className="mt-3 flex gap-4 text-[10px] uppercase tracking-wider text-neutral-500">
                  <span><strong className="text-emerald-300">{user.queries}</strong> queries</span>
                  <span><strong className="text-blue-300">{user.sessions}</strong> sessions</span>
                </div>
              </div>
            ))}
          </div>
        </AnalyticsPanel>
      )}
    </div>
  );
}

function AnalyticsMetric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-emerald-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <p className="mt-4 text-2xl font-black font-mono text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</p>
      <div className="mt-2 text-[10px] text-neutral-500">{hint}</div>
    </div>
  );
}

function GrowthLabel({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 ${positive ? "text-emerald-400" : "text-red-400"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(value)}% vs previous 7d
    </span>
  );
}

function AnalyticsPanel({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="mb-5 flex items-start gap-2 text-white">
        <span className="mt-0.5 text-emerald-400">{icon}</span>
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="mt-1 text-[11px] text-neutral-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function InteractionChart({ values }: { values: AnalyticsResponse["dailyInteractions"] }) {
  const max = Math.max(...values.map((item) => item.count), 1);
  return (
    <div className="flex h-52 items-end gap-2">
      {values.map((item) => (
        <div key={item.date} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
          <div className="mb-2 text-center text-[9px] font-mono text-neutral-500 opacity-0 transition group-hover:opacity-100">{item.count}</div>
          <div className="min-h-1 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-300 transition group-hover:brightness-125" style={{ height: `${Math.max((item.count / max) * 100, 3)}%` }} />
          <p className="mt-2 truncate text-center text-[9px] text-neutral-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function RankedBars({ values, empty }: { values: Array<{ label: string; value: number }>; empty: string }) {
  if (values.length === 0) return <EmptyState label={empty} />;
  const max = Math.max(...values.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {values.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between gap-3 text-[11px]">
            <span className="truncate font-semibold text-neutral-300">{item.label}</span>
            <span className="font-mono text-emerald-300">{item.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-300" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedList({ values, empty }: { values: Array<{ label: string; value: number; suffix: string }>; empty: string }) {
  if (values.length === 0) return <EmptyState label={empty} />;
  return (
    <div className="space-y-2">
      {values.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-[10px] font-bold text-emerald-300">{index + 1}</span>
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-neutral-300">{item.label}</p>
          <span className="shrink-0 text-[10px] font-mono text-neutral-500">{item.value} {item.suffix}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-8 text-center text-xs text-neutral-500">{label}</p>;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLatency(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}
