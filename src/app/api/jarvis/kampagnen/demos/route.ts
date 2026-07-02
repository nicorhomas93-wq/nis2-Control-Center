import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const company_name = typeof body.company_name === "string" ? body.company_name.trim() : "";

  if (!company_name) {
    return NextResponse.json({ error: "Unternehmen fehlt" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_campaign_demos")
    .insert({
      campaign_id: body.campaign_id || null,
      lead_id: body.lead_id || null,
      company_name,
      contact_name: body.contact_name?.trim() || null,
      scheduled_at: body.scheduled_at || null,
      status: body.status ?? "planned",
      result: body.result?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  if (body.lead_id) {
    await supabase
      .from("linkedin_campaign_leads")
      .update({ status: "demo_scheduled", next_step: "Demo durchführen" })
      .eq("id", body.lead_id);
  }

  return NextResponse.json({ demo: data });
}
