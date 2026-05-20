import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { ingestDocument } from './langchain';
import { prisma } from './db';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Upstash requires TLS — IORedis auto-detects from rediss:// scheme
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  // Upstash requires these for BullMQ compatibility
  enableReadyCheck: false,
  ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
});

export const ingestionQueue = new Queue('ingestion', { connection });
export const ingestionEvents = new QueueEvents('ingestion', { connection });

// Initialize the worker ONLY if not in edge runtime, usually in a separate worker process 
// but for Next.js MVP we can run it here (though true prod uses separate processes).
if (typeof window === 'undefined' && process.env.ENABLE_WORKER === 'true') {
  console.log('Starting BullMQ Ingestion Worker...');
  const worker = new Worker('ingestion', async (job) => {
    const { fileBuffer, fileName, fileType, jobId } = job.data;
    
    // Update job status
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' }
    });

    try {
      const chunksCount = await ingestDocument(Buffer.from(fileBuffer), fileName, fileType);
      
      await prisma.ingestionJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', chunksCount }
      });

      return chunksCount;
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);
      await prisma.ingestionJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: error.message }
      });
      throw error;
    }
  }, { connection });

  worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.log(`${job?.id} has failed with ${err.message}`);
  });
}
