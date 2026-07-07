import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { data, error } = await supabase
    .from("integration_providers")
    .select("*")
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  return NextResponse.json({ providers: data ?? [] });
}
