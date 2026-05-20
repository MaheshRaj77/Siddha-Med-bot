import { NextResponse } from "next/server";
import { getChatLogs, getChatStats, clearChatLogs } from "@/lib/chatLogs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

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

// GET — return all chat logs + stats
export async function GET() {
  try {
    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const logs = await getChatLogs();
    const stats = await getChatStats();
    return NextResponse.json({ logs, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — clear all chat logs
export async function DELETE() {
  try {
    const adminUser = await verifyAdminOrSuperAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await clearChatLogs();
    return NextResponse.json({ message: "Chat logs cleared" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
