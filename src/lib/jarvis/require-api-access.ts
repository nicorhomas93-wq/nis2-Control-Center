import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessJarvis } from "@/lib/jarvis/access";

export async function requireJarvisApiAccess(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canAccessJarvis(user.email, profile?.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}
