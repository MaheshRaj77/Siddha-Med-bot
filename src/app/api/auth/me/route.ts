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
    const tokenAdjustment = await getMonthlyCreditAdjustment(user.id);
    const monthlyTokenLimit = user.role === "SUPER_ADMIN"
      ? 999_999_999
      : Math.max(0, plan.monthlyTokenLimit + tokenAdjustment);
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyTokenUsage = await prisma.chatCostMetric.aggregate({
      where: {
        userId: user.id,
        createdAt: { gte: monthStart },
      },
      _sum: { totalTokens: true },
    }).catch((error: unknown) => {
      console.warn("Token usage table is unavailable; continuing with zero monthly usage.", error);
      return { _sum: { totalTokens: 0 } };
    });
    const monthlyTokensUsed = monthlyTokenUsage._sum.totalTokens || 0;

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
      tokens: {
        monthlyTokenLimit,
        monthlyTokenAdjustment: user.role === "SUPER_ADMIN" ? 0 : tokenAdjustment,
        monthlyTokensUsed,
        monthlyTokensRemaining: user.role === "SUPER_ADMIN" ? 999_999_999 : Math.max(0, monthlyTokenLimit - monthlyTokensUsed),
      },
      quota: {
        monthlyTokenLimit,
      },
      usage: {
        monthlyTokensUsed,
      },
      subscription,
    });
  } catch (error: unknown) {
    return internalServerError("auth.me", error, "Unable to load profile");
  }
}
