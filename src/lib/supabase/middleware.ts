import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getConfiguredOrigins, getHeaderDerivedOrigin, isHttpsOrigin } from "@/lib/request-origin";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const configuredOrigin = getConfiguredOrigins()[0];
  const requestOrigin = getHeaderDerivedOrigin(request.headers, request.nextUrl.origin);
  const useSecureCookies = process.env.NODE_ENV === "production"
    && isHttpsOrigin(configuredOrigin || requestOrigin);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        sameSite: "lax",
        secure: useSecureCookies,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if it exists
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes — redirect to login if not authenticated
  const isProtected =
    request.nextUrl.pathname.startsWith("/chat") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/super-admin");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const isAuth =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup";

  if (isAuth && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/redirect";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
