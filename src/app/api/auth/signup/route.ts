import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { enforceSameOrigin, getClientIp, internalServerError, parseJson } from "@/lib/server/security";
import { ensureAppUser } from "@/lib/auth/user-sync";

const signupSchema = z.object({
  email: z.string().email().trim().max(320),
  password: z.string()
    .min(12)
    .max(256)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
  name: z.string().trim().min(2).max(100),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const originError = enforceSameOrigin(req);
    if (originError) return originError;

    const rateLimitError = await enforceRateLimit("auth-signup", getClientIp(req));
    if (rateLimitError) return rateLimitError;

    const parsed = await parseJson(req, signupSchema, 4 * 1024);
    if (parsed.response) return parsed.response;
    const { email, password, name } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const emailRateLimitError = await enforceRateLimit("auth-signup", `email:${normalizedEmail}`);
    if (emailRateLimitError) return emailRateLimitError;

    const supabase = await createServerSupabaseClient();

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: name || "" },
      },
    });

    if (error) {
      const message = error.message.toLowerCase().includes("already")
        ? "An account already exists with this email. Please sign in instead."
        : "Unable to create account with those details";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Signup failed — no user returned" },
        { status: 500 }
      );
    }

    // Create corresponding User record in our database
    const user = await ensureAppUser(data.user);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message:
        data.session
          ? "Account created successfully!"
          : "Account created! Please check your email to verify.",
    });
  } catch (error: unknown) {
    return internalServerError("auth.signup", error, "Unable to create account");
  }
}
