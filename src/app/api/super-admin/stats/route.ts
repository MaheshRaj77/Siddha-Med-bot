import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/server/db";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { internalServerError } from "@/lib/server/security";

async function verifySuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user || !user.isActive || user.role !== "SUPER_ADMIN") return null;
  return user;
}

// GET /api/super-admin/stats — dashboard aggregate statistics
export async function GET() {
  try {
    const admin = await verifySuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const rateLimitError = await enforceRateLimit("privileged", admin.id);
    if (rateLimitError) return rateLimitError;

    const [
      totalUsers,
      activeUsers,
      adminCount,
      totalQueries,
      todayQueries,
      revenue,
      cost,
      paidTransactions,
      pendingRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.chatLog.count(),
      prisma.chatLog.count({
        where: {
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.paymentTransaction.aggregate({
        where: { status: "PAID" },
        _sum: { amountMinor: true },
      }).catch(() => ({ _sum: { amountMinor: 0 } })),
      prisma.chatCostMetric.aggregate({
        _sum: { estimatedCostMinor: true, totalTokens: true },
        _avg: { estimatedCostMinor: true },
      }).catch(() => ({ _sum: { estimatedCostMinor: 0, totalTokens: 0 }, _avg: { estimatedCostMinor: 0 } })),
      prisma.paymentTransaction.count({ where: { status: "PAID" } }).catch(() => 0),
      prisma.paymentTransaction.aggregate({
        where: { status: "PENDING" },
        _sum: { amountMinor: true },
      }).catch(() => ({ _sum: { amountMinor: 0 } })),
    ]);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weeklyLogs = await prisma.chatLog.findMany({
      where: { timestamp: { gte: weekAgo } },
      select: { timestamp: true },
      orderBy: { timestamp: "asc" },
    });
    const weeklyUsage = new Map<string, number>();
    weeklyLogs.forEach((log) => {
      const key = log.timestamp.toISOString().slice(0, 10);
      weeklyUsage.set(key, (weeklyUsage.get(key) || 0) + 1);
    });

    // Role distribution
    const roleDistribution = await prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    });

    const planRevenue = await prisma.paymentTransaction.groupBy({
      by: ["planSlug"],
      where: { status: "PAID" },
      _sum: { amountMinor: true },
      _count: { id: true },
      orderBy: { _sum: { amountMinor: "desc" } },
    }).catch(() => []);

    const planCosts = await prisma.chatCostMetric.groupBy({
      by: ["planSlug"],
      _sum: { estimatedCostMinor: true, totalTokens: true },
      _count: { id: true },
    }).catch(() => []);
    const costByPlan = new Map(planCosts.map((item) => [item.planSlug || "starter", item]));
    const revenueMinor = revenue._sum.amountMinor || 0;
    const estimatedCostMinor = cost._sum.estimatedCostMinor || 0;

    return NextResponse.json({
      totalUsers,
      activeUsers,
      adminCount,
      totalQueries,
      todayQueries,
      revenue: {
        paidAmountMinor: revenueMinor,
        pendingAmountMinor: pendingRevenue._sum.amountMinor || 0,
        paidTransactions,
        estimatedAiCostMinor: estimatedCostMinor,
        estimatedGrossProfitMinor: revenueMinor - estimatedCostMinor,
        averageCostPerAnswerMinor: cost._avg.estimatedCostMinor || 0,
        totalTokens: cost._sum.totalTokens || 0,
        byPlan: planRevenue.map((item) => {
          const planCost = costByPlan.get(item.planSlug);
          const planRevenueMinor = item._sum.amountMinor || 0;
          const planCostMinor = planCost?._sum.estimatedCostMinor || 0;
          return {
            planSlug: item.planSlug,
            paidAmountMinor: planRevenueMinor,
            estimatedAiCostMinor: planCostMinor,
            estimatedGrossProfitMinor: planRevenueMinor - planCostMinor,
            paidTransactions: item._count.id,
            answers: planCost?._count.id || 0,
            tokens: planCost?._sum.totalTokens || 0,
          };
        }),
      },
      weeklyUsage: Array.from(weeklyUsage.entries()).map(([date, count]) => ({
        date,
        count,
      })),
      roleDistribution: roleDistribution.map((r) => ({
        role: r.role,
        count: r._count.role,
      })),
    });
  } catch (error: unknown) {
    return internalServerError("super_admin.stats", error);
  }
}
