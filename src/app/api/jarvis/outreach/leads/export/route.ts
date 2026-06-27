import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { leadsToCsv } from "@/lib/jarvis/outreach/processor";
import type { B2BOutreachLead } from "@/lib/types";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function GET() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("b2b_outreach_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  const leads = (data ?? []).map((row) => ({
    ...(row as B2BOutreachLead),
    analysis_bullets: Array.isArray(row.analysis_bullets) ? row.analysis_bullets : [],
  }));

  const csv = leadsToCsv(leads);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="b2b-outreach-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
