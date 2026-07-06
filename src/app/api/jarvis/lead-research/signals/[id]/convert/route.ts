import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { convertResearchSignalToLead } from "@/lib/jarvis/lead-research/convert-to-lead";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;

  try {
    const result = await convertResearchSignalToLead(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Konvertierung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
