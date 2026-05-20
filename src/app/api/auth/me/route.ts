import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

// GET /api/auth/me — returns current user profile with role and quota info
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Fetch Prisma user with role
    let user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!user) {
      // Auto-create if Supabase user exists but no Prisma record
      user = await prisma.user.create({
        data: {
          supabaseId: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || null,
          role: "USER",
        },
      });
    }

    // Get quota for this role
    const quota = await prisma.queryQuota.findUnique({
      where: { role: user.role },
    });

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.queryUsage.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    // Get this month's usage
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyUsage = await prisma.queryUsage.aggregate({
      where: {
        userId: user.id,
        date: { gte: monthStart },
      },
      _sum: { count: true },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      quota: quota
        ? {
            dailyLimit: quota.dailyQueryLimit,
            monthlyLimit: quota.monthlyQueryLimit,
            maxFileUploads: quota.maxFileUploads,
          }
        : { dailyLimit: 10, monthlyLimit: 300, maxFileUploads: 0 },
      usage: {
        todayCount: usage?.count || 0,
        monthlyCount: monthlyUsage._sum.count || 0,
      },
    });
  } catch (e: any) {
    console.error("Auth/me error:", e);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
