import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { ingestionQueue } from "@/lib/server/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: "unknown",
    queue: "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "healthy";
  } catch {
    checks.database = "unhealthy";
  }

  try {
    await ingestionQueue.getWaitingCount();
    checks.queue = "healthy";
  } catch {
    checks.queue = "unhealthy";
  }

  const healthy = Object.values(checks).every((status) => status === "healthy");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
