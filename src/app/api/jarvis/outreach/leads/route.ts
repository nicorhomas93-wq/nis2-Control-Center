import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { importLeads } from "@/lib/jarvis/outreach/lead-import";
import { getOutreachQuotaInfo } from "@/lib/jarvis/outreach/processor";
import type { B2BOutreachLead } from "@/lib/types";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

function mapLead(row: Record<string, unknown>): B2BOutreachLead {
  return {
    ...(row as unknown as B2BOutreachLead),
    analysis_bullets: Array.isArray(row.analysis_bullets)
      ? (row.analysis_bullets as string[])
      : [],
  };
}

export async function GET(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("b2b_outreach_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query.limit(200);

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  const quota = await getOutreachQuotaInfo(supabase);

  return NextResponse.json({
    leads: (data ?? []).map(mapLead),
    quota,
  });
}

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const company_name = typeof body.company_name === "string" ? body.company_name.trim() : "";
  if (!company_name) {
    return NextResponse.json({ error: "Firmenname fehlt" }, { status: 400 });
  }

  const supabase = await createClient();
  const { inserted, errors } = await importLeads(supabase, [
    {
      company_name,
      industry: body.industry ?? null,
      website: body.website ?? null,
      employee_count: body.employee_count ?? null,
      contact_name: body.contact_name ?? null,
      contact_role: body.contact_role ?? null,
      contact_email: body.contact_email ?? null,
      hints: body.hints ?? null,
      source: "manual",
    },
  ]);

  if (errors.length) {
    return NextResponse.json({ error: errors[0] }, { status: 400 });
  }
  if (!inserted) {
    return NextResponse.json({ error: "Lead existiert bereits" }, { status: 409 });
  }

  const { data } = await supabase
    .from("b2b_outreach_leads")
    .select("*")
    .eq("company_name", company_name)
    .single();

  return NextResponse.json({ lead: data ? mapLead(data) : null });
}
