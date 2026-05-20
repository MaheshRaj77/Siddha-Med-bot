import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// Middleware to verify Super Admin role
async function verifySuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) return null;
  
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}

// GET /api/super-admin/users — list all users with their usage stats
export async function GET(req: NextRequest) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { chatLogs: true, sessions: true } },
    },
  });

  // Get today's date for usage lookup
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usersWithUsage = await Promise.all(
    users.map(async (u) => {
      const todayUsage = await prisma.queryUsage.findUnique({
        where: { userId_date: { userId: u.id, date: today } },
      });

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyUsage = await prisma.queryUsage.aggregate({
        where: { userId: u.id, date: { gte: monthStart } },
        _sum: { count: true },
      });

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        totalQueries: u._count.chatLogs,
        totalSessions: u._count.sessions,
        todayQueries: todayUsage?.count || 0,
        monthlyQueries: monthlyUsage._sum.count || 0,
      };
    })
  );

  return NextResponse.json({ users: usersWithUsage });
}

// PATCH /api/super-admin/users — update user role or active status
export async function PATCH(req: NextRequest) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, role, isActive } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Prevent self-demotion
  if (userId === admin.id) {
    return NextResponse.json(
      { error: "Cannot modify your own account" },
      { status: 400 }
    );
  }

  const updateData: any = {};
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
    },
  });
}

// DELETE /api/super-admin/users — delete a user
export async function DELETE(req: NextRequest) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await req.json();

  if (!userId || userId === admin.id) {
    return NextResponse.json(
      { error: "Invalid operation" },
      { status: 400 }
    );
  }

  // Delete the Prisma user (cascades to QueryUsage)
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
