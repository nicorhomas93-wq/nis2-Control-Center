import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { parseCsvLeads, importLeads } from "@/lib/jarvis/outreach/lead-import";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const csv = typeof body.csv === "string" ? body.csv : "";

  const leads = parseCsvLeads(csv);
  if (leads.length === 0) {
    return NextResponse.json(
      { error: "Keine gültigen Zeilen in CSV. Header: Firma, Branche, Website, …" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const result = await importLeads(supabase, leads);

  return NextResponse.json(result);
}
