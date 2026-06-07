import type { User as SupabaseUser } from "@supabase/supabase-js";
import prisma from "@/lib/server/db";

export async function ensureAppUser(authUser: SupabaseUser) {
  const email = authUser.email?.toLowerCase();
  if (!email) throw new Error("Authenticated user has no email address");

  const existingBySupabaseId = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  if (existingBySupabaseId) return existingBySupabaseId;

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        supabaseId: authUser.id,
        email,
        name: existingByEmail.name || getAuthUserName(authUser),
      },
    });
  }

  return prisma.user.create({
    data: {
      supabaseId: authUser.id,
      email,
      name: getAuthUserName(authUser),
      role: "USER",
    },
  });
}

function getAuthUserName(authUser: SupabaseUser) {
  const name = authUser.user_metadata?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
