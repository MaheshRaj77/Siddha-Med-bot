import "dotenv/config";
import { Worker } from "bullmq";
import { ingestionRedisConnection, processIngestionPayload, type IngestionPayload } from "@/lib/server/queue";

const worker = new Worker(
  "ingestion",
  async (job) => processIngestionPayload(job.data as IngestionPayload),
  { connection: ingestionRedisConnection }
);

worker.on("completed", (job) => {
  console.log(`[ingestion-worker] ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`[ingestion-worker] ${job?.id || "unknown"} failed`, error);
});

async function shutdown() {
  console.log("[ingestion-worker] shutting down");
  await worker.close();
  await ingestionRedisConnection.quit();
}

process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));

console.log("[ingestion-worker] started");
