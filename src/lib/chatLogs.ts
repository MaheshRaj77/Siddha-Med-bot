import { prisma } from './db';
import { Prisma } from "@prisma/client";

type SourceRef = { file: string; page: number | string; text: string };

export interface ChatLogEntry {
  id?: string;
  sessionId?: string;
  query: string;
  answer: string;
  sources: SourceRef[];
  durationMs: number;
  triageData: unknown;
}

export async function addChatLog(entry: ChatLogEntry) {
  return await prisma.chatLog.create({
    data: {
      query: entry.query,
      answer: entry.answer,
      durationMs: entry.durationMs,
      retrievedDocs: entry.sources,
      triageData: (entry.triageData || {}) as Prisma.InputJsonValue,
      sessionId: entry.sessionId,
    },
  });
}

export async function getChatLogs() {
  const logs = await prisma.chatLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 200,
  });

  return logs.map((log) => ({
    ...log,
    sources: parseJsonValue(log.retrievedDocs, []),
    triageData: parseJsonValue(log.triageData, {}),
  }));
}

export async function clearChatLogs() {
  await prisma.chatLog.deleteMany({});
}

export async function getChatStats() {
  const [total, result, uniqueSourceRows] = await Promise.all([
    prisma.chatLog.count(),
    prisma.chatLog.aggregate({
      _avg: {
        durationMs: true,
      },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      WITH normalized_logs AS (
        SELECT
          CASE
            WHEN jsonb_typeof("retrievedDocs"::jsonb) = 'string'
              THEN ("retrievedDocs" #>> '{}')::jsonb
            ELSE "retrievedDocs"::jsonb
          END AS docs
        FROM "ChatLog"
      ),
      source_files AS (
        SELECT DISTINCT source->>'file' AS file
        FROM normalized_logs
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(docs) = 'array' THEN docs ELSE '[]'::jsonb END
        ) AS source
        WHERE source ? 'file' AND source->>'file' <> ''
      )
      SELECT COUNT(*)::bigint AS count FROM source_files
    `,
  ]);

  const uniqueFiles = Number(uniqueSourceRows[0]?.count || 0);

  return { 
    totalQueries: total, 
    avgResponseMs: Math.round(result._avg.durationMs || 0), 
    uniqueSourceFiles: uniqueFiles 
  };
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (value === null || value === undefined) return fallback;
  return value as T;
}
