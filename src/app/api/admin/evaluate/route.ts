import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const execAsync = promisify(exec);

// Helper to verify user is ADMIN or SUPER_ADMIN
async function verifyAdminOrSuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) return null;
  
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

export async function GET() {
  try {
    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const runs = await prisma.evaluationRun.findMany({
      orderBy: {
        timestamp: "desc",
      },
      take: 20,
    });
    return NextResponse.json({ success: true, runs });
  } catch (error: any) {
    console.error("Failed to fetch evaluation runs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Run evaluation script using tsx
    console.log("Triggering on-demand RAG evaluation run...");
    const cmd = "npx tsx src/scripts/evaluate.ts";
    const { stdout, stderr } = await execAsync(cmd, {
      env: {
        ...process.env,
        // Ensure DATABASE_URL and other credentials exist
      },
    });

    console.log("Evaluation output:", stdout);
    if (stderr) console.warn("Evaluation stderr:", stderr);

    // Fetch the newly created evaluation run
    const latestRun = await prisma.evaluationRun.findFirst({
      orderBy: {
        timestamp: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Evaluation run completed successfully!",
      run: latestRun,
      stdout,
    });
  } catch (error: any) {
    console.error("Evaluation run failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
