import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_MANDANT_COOKIE } from "@/lib/consultant/mandanten";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Server signOut failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACTIVE_MANDANT_COOKIE);
  return response;
}
