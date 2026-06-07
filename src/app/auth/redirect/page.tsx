import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/user-sync";

export default async function AuthRedirectPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await ensureAppUser(authUser);

  if (!user.isActive) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (user.role === "SUPER_ADMIN") {
    redirect("/super-admin");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/chat");
}
