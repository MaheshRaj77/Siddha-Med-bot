import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

async function verifySuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}

// GET /api/super-admin/stats — dashboard aggregate statistics
export async function GET() {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [
    totalUsers,
    activeUsers,
    adminCount,
    totalQueries,
    todayQueries,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.chatLog.count(),
    prisma.queryUsage.aggregate({
      where: {
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { count: true },
    }),
  ]);

  // Get queries per day for last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const weeklyUsage = await prisma.queryUsage.groupBy({
    by: ["date"],
    where: { date: { gte: weekAgo } },
    _sum: { count: true },
    orderBy: { date: "asc" },
  });

  // Role distribution
  const roleDistribution = await prisma.user.groupBy({
    by: ["role"],
    _count: { role: true },
  });

  return NextResponse.json({
    totalUsers,
    activeUsers,
    adminCount,
    totalQueries,
    todayQueries: todayQueries._sum.count || 0,
    weeklyUsage: weeklyUsage.map((w) => ({
      date: w.date,
      count: w._sum.count || 0,
    })),
    roleDistribution: roleDistribution.map((r) => ({
      role: r.role,
      count: r._count.role,
    })),
  });
}
