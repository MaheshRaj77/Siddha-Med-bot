import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/server/db";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { auditSecurityEvent, enforceSameOrigin, internalServerError, parseJson, uuidSchema } from "@/lib/server/security";
import { mergePricingPlans } from "@/lib/billing/pricing";
import { getCreditPeriodStart, getMonthlyCreditAdjustment } from "@/lib/billing/credits";

const strongPassword = z.string()
  .min(12)
  .max(256)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const updateUserSchema = z.object({
  userId: uuidSchema,
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).optional(),
  isActive: z.boolean().optional(),
  password: strongPassword.optional(),
  planSlug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/).optional(),
  tokenAdjustment: z.object({
    amount: z.number().int().min(-50_000_000).max(50_000_000),
    reason: z.string().trim().min(3).max(500),
  }).optional(),
}).strict().refine(
  ({ role, isActive, password, planSlug, tokenAdjustment }) =>
    role !== undefined || isActive !== undefined || password !== undefined || planSlug !== undefined || tokenAdjustment !== undefined
);

const deleteUserSchema = z.object({ userId: uuidSchema }).strict();

// Middleware to verify Super Admin role
async function verifySuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) return null;
  
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  
  if (!user || !user.isActive || user.role !== "SUPER_ADMIN") return null;
  return user;
}

// GET /api/super-admin/users — list all users with their usage stats
export async function GET() {
  try {
    const admin = await verifySuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const rateLimitError = await enforceRateLimit("privileged", admin.id);
    if (rateLimitError) return rateLimitError;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { chatLogs: true, sessions: true } },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plans = mergePricingPlans(await prisma.pricingPlan.findMany());

    const usersWithUsage = await Promise.all(
      users.map(async (u) => {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyTokenUsage = await prisma.chatCostMetric.aggregate({
          where: { userId: u.id, createdAt: { gte: monthStart } },
          _sum: { totalTokens: true },
        });
        const plan = plans.find((candidate) => candidate.slug === u.planSlug);
        const monthlyTokenAdjustment = await getMonthlyCreditAdjustment(u.id, today);
        const monthlyTokenLimit = u.role === "SUPER_ADMIN" ? 999_999_999 : Math.max(0, (plan?.monthlyTokenLimit ?? 0) + monthlyTokenAdjustment);
        const monthlyTokensUsed = monthlyTokenUsage._sum.totalTokens || 0;

        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          planSlug: u.planSlug,
          isActive: u.isActive,
          createdAt: u.createdAt,
          totalQueries: u._count.chatLogs,
          totalSessions: u._count.sessions,
          tokens: {
            monthlyTokenLimit,
            monthlyTokenAdjustment,
            monthlyTokensUsed,
            monthlyTokensRemaining: monthlyTokenLimit >= 999_999_999 ? 999_999_999 : Math.max(0, monthlyTokenLimit - monthlyTokensUsed),
          },
        };
      })
    );

    return NextResponse.json({ users: usersWithUsage });
  } catch (error: unknown) {
    return internalServerError("super_admin.users.list", error);
  }
}

// PATCH /api/super-admin/users — update user role or active status
export async function PATCH(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const admin = await verifySuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", admin.id);
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, updateUserSchema);
    if (parsed.response) return parsed.response;
    const { userId, role, isActive, password, planSlug, tokenAdjustment } = parsed.data;

    // Prevent self-demotion or self password change
    if (userId === admin.id) {
      return NextResponse.json(
        { error: "Cannot modify your own account" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (password) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: "Server is not configured for password resets." }, { status: 500 });
      }

      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        }
      );

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.supabaseId,
        { password }
      );

      if (authError) {
        console.error("[server-error] super_admin.users.password_update", authError);
        return NextResponse.json({ error: "Failed to update password" }, { status: 502 });
      }
    }

    const updateData: {
      role?: "USER" | "ADMIN" | "SUPER_ADMIN";
      isActive?: boolean;
      planSlug?: string;
    } = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (planSlug !== undefined) {
      const availablePlans = mergePricingPlans(await prisma.pricingPlan.findMany());
      if (!availablePlans.some((plan) => plan.slug === planSlug)) {
        return NextResponse.json({ error: "Pricing plan not found" }, { status: 400 });
      }
      updateData.planSlug = planSlug;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    if (tokenAdjustment) {
      await prisma.creditAdjustment.create({
        data: {
          userId,
          actorId: admin.id,
          amount: tokenAdjustment.amount,
          reason: tokenAdjustment.reason,
          periodStart: getCreditPeriodStart(),
        },
      });
    }

    auditSecurityEvent("super_admin.user.update", admin.id, {
      targetUserId: updated.id,
      roleChanged: role !== undefined,
      activeChanged: isActive !== undefined,
      passwordChanged: password !== undefined,
      planChanged: planSlug !== undefined,
      tokenAdjustmentChanged: tokenAdjustment !== undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        planSlug: updated.planSlug,
        isActive: updated.isActive,
      },
    });
  } catch (error: unknown) {
    return internalServerError("super_admin.users.update", error);
  }
}

// DELETE /api/super-admin/users — delete a user
export async function DELETE(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const admin = await verifySuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rateLimitError = await enforceRateLimit("privileged", admin.id);
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, deleteUserSchema);
    if (parsed.response) return parsed.response;
    const { userId } = parsed.data;

    if (!userId || userId === admin.id) {
      return NextResponse.json(
        { error: "Invalid operation" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server is not configured for identity deletion." }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.supabaseId);
    if (authError) {
      console.error("[server-error] super_admin.users.identity_delete", authError);
      return NextResponse.json({ error: "Failed to delete identity" }, { status: 502 });
    }

    await prisma.user.delete({ where: { id: userId } });
    auditSecurityEvent("super_admin.user.delete", admin.id, { targetUserId: userId });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return internalServerError("super_admin.users.delete", error);
  }
}
