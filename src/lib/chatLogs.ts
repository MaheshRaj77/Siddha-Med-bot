import { prisma } from './db';

export interface ChatLogEntry {
  id?: string;
  sessionId?: string;
  query: string;
  answer: string;
  sources: Array<{ file: string; page: number | string; text: string }>;
  durationMs: number;
  triageData: any;
}

export async function addChatLog(entry: ChatLogEntry) {
  return await prisma.chatLog.create({
    data: {
      query: entry.query,
      answer: entry.answer,
      durationMs: entry.durationMs,
      retrievedDocs: JSON.stringify(entry.sources),
      triageData: JSON.stringify(entry.triageData || {}),
      sessionId: entry.sessionId,
    },
  });
}

export async function getChatLogs() {
  const logs = await prisma.chatLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 200,
  });

  return logs.map((log: any) => ({
    ...log,
    sources: JSON.parse(log.retrievedDocs as string || '[]'),
    triageData: JSON.parse(log.triageData as string || '{}'),
  }));
}

export async function clearChatLogs() {
  await prisma.chatLog.deleteMany({});
}

export async function getChatStats() {
  const total = await prisma.chatLog.count();
  
  const result = await prisma.chatLog.aggregate({
    _avg: {
      durationMs: true,
    },
  });

  // Calculate unique source files (simpler approximation for now to avoid complex JSON querying in Prisma)
  const allLogs = await prisma.chatLog.findMany({ select: { retrievedDocs: true } });
  const uniqueFiles = new Set(
    allLogs.flatMap(l => {
      try {
        const docs = JSON.parse(l.retrievedDocs as string || '[]');
        return docs.map((s: any) => s.file);
      } catch (e) {
        return [];
      }
    })
  ).size;

  return { 
    totalQueries: total, 
    avgResponseMs: Math.round(result._avg.durationMs || 0), 
    uniqueSourceFiles: uniqueFiles 
  };
}
