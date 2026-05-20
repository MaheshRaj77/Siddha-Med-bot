import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Get or create the corresponding Prisma user
    let user = await prisma.user.findUnique({
      where: { supabaseId: data.user.id },
    });

    if (!user) {
      // Edge case: Supabase user exists but no Prisma record
      user = await prisma.user.create({
        data: {
          supabaseId: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || null,
          role: "USER",
        },
      });
    }

    if (!user.isActive) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Your account has been deactivated. Contact the administrator." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e: any) {
    console.error("Login error:", e);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (e: any) {
    console.error("Logout error:", e);
    return NextResponse.json(
      { error: e.message || "Logout failed" },
      { status: 500 }
    );
  }
}
