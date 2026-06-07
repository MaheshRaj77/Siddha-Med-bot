import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { ingestDocument } from './langchain';
import { prisma } from './db';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Upstash requires TLS — IORedis auto-detects from rediss:// scheme
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  // Upstash requires these for BullMQ compatibility
  enableReadyCheck: false,
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
});

export const ingestionQueue = new Queue('ingestion', { connection });
export const ingestionEvents = new QueueEvents('ingestion', { connection });

export type IngestionPayload = {
  fileBase64: string;
  fileName: string;
  fileType: string;
  jobId: string;
};

export async function processIngestionPayload(payload: IngestionPayload) {
  const { fileBase64, fileName, fileType, jobId } = payload;

  await prisma.ingestionJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', error: null }
  });

  try {
    const chunksCount = await ingestDocument(Buffer.from(fileBase64, 'base64'), fileName, fileType);

    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', chunksCount, error: null }
    });

    return chunksCount;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    console.error(`Ingestion job ${jobId} failed:`, error);
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: message }
    });
    throw error;
  }
}

export { connection as ingestionRedisConnection };
