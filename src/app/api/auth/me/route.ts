import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/server/db";
import { resolveUserPlan } from "@/lib/billing/pricing-server";
import { internalServerError } from "@/lib/server/security";
import { getMonthlyCreditAdjustment } from "@/lib/billing/credits";
import { ensureAppUser } from "@/lib/auth/user-sync";

// GET /api/auth/me — returns current user profile with role and credit balance info
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await ensureAppUser(authUser);

    if (!user.isActive) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const plan = await resolveUserPlan(user.planSlug);
    const creditAdjustment = await getMonthlyCreditAdjustment(user.id);
    const monthlyCreditLimit = user.role === "SUPER_ADMIN"
      ? 999999
      : Math.max(0, plan.monthlyQueryLimit + creditAdjustment);
    const subscription = await prisma.billingSubscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "PENDING", "PAST_DUE"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        planSlug: true,
        status: true,
        interval: true,
        currency: true,
        amountMinor: true,
        currentPeriodEnd: true,
        provider: true,
      },
    }).catch((error: unknown) => {
      console.warn("BillingSubscription table is unavailable; continuing without subscription status.", error);
      return null;
    });

    // Get today's credit usage. One chat submission currently consumes one credit.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.queryUsage.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    }).catch((error: unknown) => {
      console.warn("Credit usage table is unavailable; continuing with zero daily usage.", error);
      return null;
    });

    // Get this month's credit usage
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyUsage = await prisma.queryUsage.aggregate({
      where: {
        userId: user.id,
        date: { gte: monthStart },
      },
      _sum: { count: true },
    }).catch((error: unknown) => {
      console.warn("Credit usage table is unavailable; continuing with zero monthly usage.", error);
      return { _sum: { count: 0 } };
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        planSlug: user.planSlug,
        planName: plan.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      credits: {
        dailyLimit: user.role === "SUPER_ADMIN" ? 999999 : plan.dailyQueryLimit,
        monthlyLimit: monthlyCreditLimit,
        monthlyAdjustment: user.role === "SUPER_ADMIN" ? 0 : creditAdjustment,
        todayUsed: usage?.count || 0,
        monthlyUsed: monthlyUsage._sum.count || 0,
        todayRemaining: user.role === "SUPER_ADMIN" ? 999999 : Math.max(0, plan.dailyQueryLimit - (usage?.count || 0)),
        monthlyRemaining: user.role === "SUPER_ADMIN" ? 999999 : Math.max(0, monthlyCreditLimit - (monthlyUsage._sum.count || 0)),
      },
      quota: {
        dailyLimit: user.role === "SUPER_ADMIN" ? 999999 : plan.dailyQueryLimit,
        monthlyLimit: monthlyCreditLimit,
      },
      usage: {
        todayCount: usage?.count || 0,
        monthlyCount: monthlyUsage._sum.count || 0,
      },
      subscription,
    });
  } catch (error: unknown) {
    return internalServerError("auth.me", error, "Unable to load profile");
  }
}
