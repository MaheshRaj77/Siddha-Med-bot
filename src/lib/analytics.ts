import type { Role } from "@prisma/client";
import prisma from "@/lib/db";

const ANALYTICS_WINDOW_DAYS = 14;
const MAX_ANALYTICS_LOGS = 5000;
const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "can", "could", "does",
  "for", "from", "have", "help", "how", "into", "medicine", "medicines", "my",
  "need", "please", "should", "siddha", "that", "the", "their", "this", "use",
  "using", "want", "what", "when", "where", "which", "with", "would", "your",
  "enna", "epdi", "iruku", "irukku", "ku", "la", "na", "um",
]);

interface AnalyticsLog {
  timestamp: Date;
  query: string;
  durationMs: number;
  sessionId: string | null;
  userId: string | null;
  retrievedDocs: unknown;
  triageData: unknown;
  user: { email: string; name: string | null } | null;
}

export interface AnalyticsResponse {
  generatedAt: string;
  windowDays: number;
  summary: {
    totalQueries: number;
    queriesToday: number;
    queriesLast7Days: number;
    previous7DaysQueries: number;
    queryGrowthPercent: number;
    activeUsers: number;
    sessions: number;
    averageResponseMs: number;
    triageInteractions: number;
    triageRate: number;
    peakHourLabel: string;
  };
  dailyInteractions: Array<{ date: string; label: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  topQuestions: Array<{ query: string; count: number }>;
  topSources: Array<{ source: string; count: number }>;
  topUsers?: Array<{ label: string; email: string; queries: number; sessions: number }>;
}

export async function getAnalytics(role: Role): Promise<AnalyticsResponse> {
  const now = new Date();
  const today = startOfDay(now);
  const windowStart = addDays(today, -(ANALYTICS_WINDOW_DAYS - 1));
  const currentWeekStart = addDays(today, -6);
  const previousWeekStart = addDays(today, -13);

  const [totalQueries, logs] = await Promise.all([
    prisma.chatLog.count(),
    prisma.chatLog.findMany({
      where: { timestamp: { gte: windowStart } },
      orderBy: { timestamp: "desc" },
      take: MAX_ANALYTICS_LOGS,
      select: {
        timestamp: true,
        query: true,
        durationMs: true,
        sessionId: true,
        userId: true,
        retrievedDocs: true,
        triageData: true,
        user: { select: { email: true, name: true } },
      },
    }),
  ]);

  const dailyCounts = new Map<string, number>();
  const keywordCounts = new Map<string, number>();
  const questionCounts = new Map<string, { query: string; count: number }>();
  const sourceCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  const userActivity = new Map<string, { label: string; email: string; queries: number; sessions: Set<string> }>();
  const activeUsers = new Set<string>();
  const sessions = new Set<string>();
  let queriesToday = 0;
  let queriesLast7Days = 0;
  let previous7DaysQueries = 0;
  let totalResponseMs = 0;
  let triageInteractions = 0;

  for (const log of logs as AnalyticsLog[]) {
    const dateKey = formatDateKey(log.timestamp);
    dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    totalResponseMs += log.durationMs;
    hourCounts.set(log.timestamp.getHours(), (hourCounts.get(log.timestamp.getHours()) || 0) + 1);

    if (log.timestamp >= today) queriesToday++;
    if (log.timestamp >= currentWeekStart) queriesLast7Days++;
    else if (log.timestamp >= previousWeekStart) previous7DaysQueries++;

    if (log.userId) activeUsers.add(log.userId);
    if (log.sessionId) sessions.add(log.sessionId);

    tokenize(log.query).forEach((keyword) => {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    });

    const normalizedQuery = normalizeQuestion(log.query);
    const existingQuestion = questionCounts.get(normalizedQuery);
    questionCounts.set(normalizedQuery, {
      query: existingQuestion?.query || log.query.trim(),
      count: (existingQuestion?.count || 0) + 1,
    });

    for (const source of getSources(log.retrievedDocs)) {
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    }

    if (isTriageInteraction(log.triageData)) triageInteractions++;

    if (log.userId && log.user) {
      const activity = userActivity.get(log.userId) || {
        label: log.user.name || log.user.email,
        email: log.user.email,
        queries: 0,
        sessions: new Set<string>(),
      };
      activity.queries++;
      if (log.sessionId) activity.sessions.add(log.sessionId);
      userActivity.set(log.userId, activity);
    }
  }

  const dailyInteractions = Array.from({ length: ANALYTICS_WINDOW_DAYS }, (_, offset) => {
    const date = addDays(windowStart, offset);
    return {
      date: formatDateKey(date),
      label: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      count: dailyCounts.get(formatDateKey(date)) || 0,
    };
  });
  const peakHour = sortedEntries(hourCounts)[0]?.[0];

  return {
    generatedAt: now.toISOString(),
    windowDays: ANALYTICS_WINDOW_DAYS,
    summary: {
      totalQueries,
      queriesToday,
      queriesLast7Days,
      previous7DaysQueries,
      queryGrowthPercent: percentageChange(queriesLast7Days, previous7DaysQueries),
      activeUsers: activeUsers.size,
      sessions: sessions.size,
      averageResponseMs: logs.length > 0 ? Math.round(totalResponseMs / logs.length) : 0,
      triageInteractions,
      triageRate: logs.length > 0 ? triageInteractions / logs.length : 0,
      peakHourLabel: typeof peakHour === "number" ? formatHour(peakHour) : "No activity",
    },
    dailyInteractions,
    topKeywords: sortedEntries(keywordCounts).slice(0, 12).map(([keyword, count]) => ({ keyword, count })),
    topQuestions: [...questionCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    topSources: sortedEntries(sourceCounts).slice(0, 8).map(([source, count]) => ({ source, count })),
    ...(role === "SUPER_ADMIN" && {
      topUsers: [...userActivity.values()]
        .sort((a, b) => b.queries - a.queries)
        .slice(0, 8)
        .map((user) => ({ label: user.label, email: user.email, queries: user.queries, sessions: user.sessions.size })),
    }),
  };
}

function tokenize(query: string) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ""))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

function normalizeQuestion(query: string) {
  return query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function getSources(value: unknown) {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.file === "string"
        ? candidate.file
        : typeof candidate.source_file === "string"
          ? candidate.source_file
          : typeof candidate.source === "string"
            ? candidate.source
            : null;
    })
    .filter((source): source is string => Boolean(source));
}

function isTriageInteraction(value: unknown) {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  const triage = parsed as Record<string, unknown>;
  return triage.needsDoctor === true || triage.needs_doctor === true || triage.requiresDoctor === true;
}

function parseJsonValue(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function sortedEntries<Key extends string | number>(map: Map<Key, number>) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized}:00 ${suffix} - ${normalized}:59 ${suffix}`;
}
