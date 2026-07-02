import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { leadsToCsv } from "@/lib/jarvis/outreach/processor";
import {
  leadsToFinderCsv,
  leadsToFinderExcel,
} from "@/lib/jarvis/outreach/lead-finder-export";
import { mapOutreachLead } from "@/lib/jarvis/outreach/outreach-lead-map";
import type { B2BOutreachLead } from "@/lib/types";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function GET(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "finder-csv";
  const useLegacy = format === "csv" || format === "legacy-csv";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("b2b_outreach_leads")
    .select("*")
    .order("lead_quality_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  const leads = (data ?? []).map((row) => mapOutreachLead(row as Record<string, unknown>));
  const date = new Date().toISOString().slice(0, 10);

  if (useLegacy) {
    const csv = leadsToCsv(leads as B2BOutreachLead[]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="b2b-outreach-${date}.csv"`,
      },
    });
  }

  if (format === "excel" || format === "xls") {
    const xml = leadsToFinderExcel(leads);
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="jarvis-lead-finder-${date}.xls"`,
      },
    });
  }

  const csv = leadsToFinderCsv(leads);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jarvis-lead-finder-${date}.csv"`,
    },
  });
}
