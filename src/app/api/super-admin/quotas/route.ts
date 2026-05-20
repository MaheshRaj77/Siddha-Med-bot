import { NextRequest, NextResponse } from "next/server";
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

// GET /api/super-admin/quotas — get all quota configurations
export async function GET() {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const quotas = await prisma.queryQuota.findMany({
    orderBy: { role: "asc" },
  });

  // If no quotas exist yet, return defaults
  const roles = ["USER", "ADMIN", "SUPER_ADMIN"] as const;
  const defaults: Record<string, { daily: number; monthly: number; uploads: number }> = {
    USER: { daily: 10, monthly: 300, uploads: 0 },
    ADMIN: { daily: 100, monthly: 3000, uploads: 50 },
    SUPER_ADMIN: { daily: 999999, monthly: 999999, uploads: 999999 },
  };

  const result = roles.map((role) => {
    const existing = quotas.find((q) => q.role === role);
    return {
      role,
      dailyQueryLimit: existing?.dailyQueryLimit ?? defaults[role].daily,
      monthlyQueryLimit: existing?.monthlyQueryLimit ?? defaults[role].monthly,
      maxFileUploads: existing?.maxFileUploads ?? defaults[role].uploads,
      id: existing?.id || null,
    };
  });

  return NextResponse.json({ quotas: result });
}

// PUT /api/super-admin/quotas — update quota for a role
export async function PUT(req: NextRequest) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { role, dailyQueryLimit, monthlyQueryLimit, maxFileUploads } = await req.json();

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  const quota = await prisma.queryQuota.upsert({
    where: { role },
    update: {
      dailyQueryLimit: dailyQueryLimit ?? 10,
      monthlyQueryLimit: monthlyQueryLimit ?? 300,
      maxFileUploads: maxFileUploads ?? 0,
    },
    create: {
      role,
      dailyQueryLimit: dailyQueryLimit ?? 10,
      monthlyQueryLimit: monthlyQueryLimit ?? 300,
      maxFileUploads: maxFileUploads ?? 0,
    },
  });

  return NextResponse.json({ success: true, quota });
}
