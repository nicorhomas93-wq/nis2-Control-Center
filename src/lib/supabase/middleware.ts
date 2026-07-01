import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessJarvis } from "@/lib/jarvis/access";
import {
  isInvitePath,
  PENDING_INVITE_COOKIE,
  pendingInviteCookieOptions,
} from "@/lib/auth/invite-cookie";

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
  "/owner",
];

const AUTH_ENTRY_PATHS = ["/", "/login", "/register"];

function resolvePostAuthPath(request: NextRequest): string {
  const redirect = request.nextUrl.searchParams.get("redirect");
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }

  const pendingInvite = request.cookies.get(PENDING_INVITE_COOKIE)?.value;
  if (isInvitePath(pendingInvite)) {
    return pendingInvite;
  }

  return "/dashboard";
}

function attachPendingInviteCookie(response: NextResponse, path: string) {
  if (!isInvitePath(path)) return;
  response.cookies.set(PENDING_INVITE_COOKIE, path, pendingInviteCookieOptions());
}

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
      const url = request.nextUrl.clone();
      url.pathname = resolvePostAuthPath(request);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (user && AUTH_ENTRY_PATHS.includes(path)) {
      const url = request.nextUrl.clone();
      url.pathname = resolvePostAuthPath(request);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isInvitePath(path)) {
      attachPendingInviteCookie(supabaseResponse, path);
    }

    if ((path.startsWith("/login") || path.startsWith("/register")) && !request.nextUrl.searchParams.get("redirect")) {
      const pendingInvite = request.cookies.get(PENDING_INVITE_COOKIE)?.value;
      if (isInvitePath(pendingInvite)) {
        const url = request.nextUrl.clone();
        url.searchParams.set("redirect", pendingInvite);
        return NextResponse.redirect(url);
      }
    }

    if (user && path.startsWith("/jarvis") && !(await resolveJarvisAccess(supabase, user))) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (user && path.startsWith("/api/jarvis") && !(await resolveJarvisAccess(supabase, user))) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    if (user && (path.startsWith("/owner") || path.startsWith("/api/owner"))) {
      const jarvisOk = await resolveJarvisAccess(supabase, user);
      if (!jarvisOk) {
        if (path.startsWith("/api/")) {
          return NextResponse.json({ error: "Keine Berechtigung zum Löschen." }, { status: 403 });
        }
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Middleware auth error:", error);
    return NextResponse.next({ request });
  }
}
