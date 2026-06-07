import { prisma } from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { auditSecurityEvent, enforceSameOrigin, internalServerError } from "@/lib/server/security";
import { runEvaluation } from "@/scripts/evaluate";

// Helper to verify user is ADMIN or SUPER_ADMIN
async function verifyAdminOrSuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) return null;
  
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  
  if (!user || !user.isActive || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

async function getEvaluationEngineSnapshot() {
  const [activeChunks, sourceDocuments, activeJobs, latestRun] = await Promise.all([
    prisma.documentChunk.count(),
    prisma.documentMetadata.count(),
    prisma.ingestionJob.groupBy({
      by: ["status"],
      where: { status: { in: ["PENDING", "PROCESSING"] } },
      _count: { _all: true },
    }),
    prisma.evaluationRun.findFirst({
      orderBy: { timestamp: "desc" },
      select: { id: true, timestamp: true, overallScore: true },
    }),
  ]);

  return {
    activeChunks,
    sourceDocuments,
    pendingJobs: activeJobs.find((job) => job.status === "PENDING")?._count._all || 0,
    processingJobs: activeJobs.find((job) => job.status === "PROCESSING")?._count._all || 0,
    staticCases: 6,
    syntheticSeedChunks: Math.min(activeChunks, 2),
    latestRun,
  };
}

export async function GET() {
  try {
    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", adminUser.id);
    if (rateLimitError) return rateLimitError;

    const runs = await prisma.evaluationRun.findMany({
      orderBy: {
        timestamp: "desc",
      },
      take: 20,
    });
    const engine = await getEvaluationEngineSnapshot();
    return NextResponse.json({ success: true, runs, engine });
  } catch (error: unknown) {
    return internalServerError("admin.evaluate.list", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", adminUser.id);
    if (rateLimitError) return rateLimitError;

    // Run the bundled evaluator directly so the standalone deployment works
    // without relying on repository source files or an npx subprocess.
    console.log("Triggering on-demand RAG evaluation run...");
    const startedAt = Date.now();
    const latestRun = await runEvaluation();
    const engine = await getEvaluationEngineSnapshot();
    auditSecurityEvent("admin.evaluation.run", adminUser.id);

    return NextResponse.json({
      success: true,
      message: "Evaluation run completed successfully!",
      run: latestRun,
      engine,
      durationMs: Date.now() - startedAt,
    });
  } catch (error: unknown) {
    return internalServerError("admin.evaluate.run", error);
  }
}
