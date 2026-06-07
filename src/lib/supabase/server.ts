import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getConfiguredOrigins, getHeaderDerivedOrigin, isHttpsOrigin } from "@/lib/request-origin";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const configuredOrigin = getConfiguredOrigins()[0];
  const requestOrigin = getHeaderDerivedOrigin(headerStore);
  const useSecureCookies = process.env.NODE_ENV === "production"
    && isHttpsOrigin(configuredOrigin || requestOrigin);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        sameSite: "lax",
        secure: useSecureCookies,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
