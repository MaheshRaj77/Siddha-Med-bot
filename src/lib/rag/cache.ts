import { Redis } from "@upstash/redis";

export const RETRIEVAL_CACHE_TTL_SECONDS = 3600;
const INDEX_VERSION_KEY = "rag:index_version";
const CACHE_PREFIX = "rag:retrieval";

export const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? Redis.fromEnv()
  : null;

export async function getRetrievalCacheVersion() {
  if (!redis) return "local";
  try {
    const value = await redis.get<string>(INDEX_VERSION_KEY);
    return value || "0";
  } catch {
    return "0";
  }
}

export async function bumpRetrievalCacheVersion() {
  if (!redis) return;
  try {
    await redis.incr(INDEX_VERSION_KEY);
  } catch (error) {
    console.warn("Failed to bump RAG retrieval cache version:", error);
  }
}

export function buildRetrievalCacheKey(version: string, query: string) {
  const encodedQuery = Buffer.from(query).toString("base64url");
  return `${CACHE_PREFIX}:${version}:${encodedQuery}`;
}
