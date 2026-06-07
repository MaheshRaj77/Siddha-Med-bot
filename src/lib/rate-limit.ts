import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type LimitName = "auth-login" | "auth-signup" | "chat" | "privileged";

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

const limiters = redis
  ? {
      "auth-login": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "15 m"),
        prefix: "ratelimit:auth-login",
      }),
      "auth-signup": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        prefix: "ratelimit:auth-signup",
      }),
      chat: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        prefix: "ratelimit:chat",
      }),
      privileged: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        prefix: "ratelimit:privileged",
      }),
    }
  : null;

export async function enforceRateLimit(
  name: LimitName,
  identifier: string
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "production" && (name === "auth-login" || name === "auth-signup")) {
    return null;
  }

  if (!limiters) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Security service unavailable" },
        { status: 503 }
      );
    }
    return null;
  }

  const result = await limiters[name].limit(identifier);
  if (!result.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
        },
      }
    );
  }

  return null;
}
