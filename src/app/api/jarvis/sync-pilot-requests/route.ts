import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncPilotRequestsToLeads } from "@/lib/jarvis/sync-pilot-requests";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const result = await syncPilotRequestsToLeads(supabase);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync fehlgeschlagen";
    const dbError =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string; message?: string })
        : null;
    return NextResponse.json(
      {
        error: message,
        missingTable: isMissingTableError(dbError),
      },
      { status: 500 }
    );
  }
}
