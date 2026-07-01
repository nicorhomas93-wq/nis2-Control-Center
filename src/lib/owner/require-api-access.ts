import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformOwner } from "@/lib/jarvis/access";
import { OWNER_DELETE_DENIED } from "@/lib/owner/types";

export async function requireOwnerApiAccess(): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: OWNER_DELETE_DENIED }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isPlatformOwner(user.email, profile?.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: OWNER_DELETE_DENIED }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id, email: user.email ?? null };
}
