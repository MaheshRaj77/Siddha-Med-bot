import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { enforceSameOrigin, getClientIp, internalServerError, logServerError, parseJson } from "@/lib/server/security";
import { ensureAppUser } from "@/lib/auth/user-sync";

const loginSchema = z.object({
  email: z.string().email().trim().max(320),
  password: z.string().min(1).max(256),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = await enforceRateLimit("auth-login", getClientIp(req));
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, loginSchema, 4 * 1024);
    if (parsed.response) return parsed.response;
    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const emailRateLimitError = await enforceRateLimit("auth-login", `email:${normalizedEmail}`);
    if (emailRateLimitError) return emailRateLimitError;

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const message = error.message.toLowerCase().includes("confirm")
        ? "Please verify your email before signing in."
        : "Invalid email or password";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const user = await ensureAppUser(data.user);

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
  } catch (error: unknown) {
    return internalServerError("auth.login", error, "Unable to sign in");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: unknown) {
    logServerError("auth.logout", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
