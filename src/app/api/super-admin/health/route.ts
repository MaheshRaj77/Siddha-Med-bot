import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ingestionQueue } from "@/lib/server/queue";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { auditSecurityEvent, enforceSameOrigin, internalServerError, parseJson } from "@/lib/server/security";

const healthActionSchema = z.object({
  action: z.literal("clean_failed_jobs"),
}).strict();

async function verifySuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user || !user.isActive || user.role !== "SUPER_ADMIN") return null;
  return user;
}

export async function GET() {
  try {
    const admin = await verifySuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const rateLimitError = await enforceRateLimit("privileged", admin.id);
    if (rateLimitError) return rateLimitError;

    let dbHealth = "unknown";
    let redisHealth = "unknown";
    let queueStats = { waiting: 0, active: 0, completed: 0, failed: 0 };
    let auditLogCount = 0;
    let recentCostMetricCount = 0;

    try {
      // 1. Check DB Connection
      await prisma.$queryRaw`SELECT 1`;
      const since = new Date();
      since.setHours(since.getHours() - 24);
      [auditLogCount, recentCostMetricCount] = await Promise.all([
        prisma.securityAuditLog.count({ where: { createdAt: { gte: since } } }).catch(() => 0),
        prisma.chatCostMetric.count({ where: { createdAt: { gte: since } } }).catch(() => 0),
      ]);
      dbHealth = "healthy";
    } catch {
      dbHealth = "unhealthy";
    }

    try {
      // 2. Check Redis / Queue
      const [waiting, active, completed, failed] = await Promise.all([
        ingestionQueue.getWaitingCount(),
        ingestionQueue.getActiveCount(),
        ingestionQueue.getCompletedCount(),
        ingestionQueue.getFailedCount()
      ]);
      queueStats = { waiting, active, completed, failed };
      redisHealth = "healthy";
    } catch {
      redisHealth = "unhealthy";
    }

    return NextResponse.json({
      dbHealth,
      redisHealth,
      queueStats,
      auditLogCount24h: auditLogCount,
      costMetricCount24h: recentCostMetricCount,
      securityHeaders: {
        csp: "enabled",
        frameAncestors: "none",
        contentTypeOptions: "nosniff",
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    return internalServerError("super_admin.health", error);
  }
}

export async function POST(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;

  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const rateLimitError = await enforceRateLimit("privileged", admin.id);
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, healthActionSchema);
    if (parsed.response) return parsed.response;

    await ingestionQueue.clean(0, 1000, "failed");
    auditSecurityEvent("super_admin.queue.clean_failed", admin.id);
    return NextResponse.json({ success: true, message: "Failed jobs cleaned." });
  } catch (error: unknown) {
    return internalServerError("super_admin.health.action", error);
  }
}
