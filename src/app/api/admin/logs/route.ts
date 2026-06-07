import { NextRequest, NextResponse } from "next/server";
import { getChatLogs, getChatStats, clearChatLogs } from "@/lib/observability/chat-logs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { auditSecurityEvent, enforceSameOrigin, internalServerError } from "@/lib/server/security";

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

// GET — return all chat logs + stats
export async function GET() {
  try {
    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", adminUser.id);
    if (rateLimitError) return rateLimitError;

    const logs = await getChatLogs();
    const stats = await getChatStats();
    auditSecurityEvent("admin.chat_logs.read", adminUser.id, { count: logs.length });
    return NextResponse.json({ logs, stats });
  } catch (error: unknown) {
    return internalServerError("admin.chat_logs.list", error);
  }
}

// DELETE — clear all chat logs
export async function DELETE(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser || adminUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", adminUser.id);
    if (rateLimitError) return rateLimitError;

    await clearChatLogs();
    auditSecurityEvent("admin.chat_logs.clear", adminUser.id);
    return NextResponse.json({ message: "Chat logs cleared" });
  } catch (error: unknown) {
    return internalServerError("admin.chat_logs.clear", error);
  }
}
