import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessJarvis } from "@/lib/jarvis/access";

async function resolveJarvisAccess(
  supabase: ReturnType<typeof createServerClient>,
  user: { id: string; email?: string | null }
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return canAccessJarvis(user.email, profile?.role);
}

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/company",
  "/assessment",
  "/betroffenheit",
  "/documents",
  "/risks",
  "/measures",
  "/incidents",
  "/audit",
  "/export",
  "/jarvis",
  "/settings",
  "/billing",
];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === "/betroffenheit" || path.startsWith("/betroffenheit/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/assessment";
    return NextResponse.redirect(url);
  }

  if (path === "/export" || path.startsWith("/export/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/audit";
    return NextResponse.redirect(url);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAuthRoute = path.startsWith("/login") || path.startsWith("/register");
    const isProtectedRoute = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute) {
      const redirect = request.nextUrl.searchParams.get("redirect");
      const url = request.nextUrl.clone();
      url.pathname =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (user && path.startsWith("/jarvis") && !(await resolveJarvisAccess(supabase, user))) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (user && path.startsWith("/api/jarvis") && !(await resolveJarvisAccess(supabase, user))) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Middleware auth error:", error);
    return NextResponse.next({ request });
  }
}
