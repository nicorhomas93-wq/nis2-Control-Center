import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { statusUpdateFields } from "@/lib/jarvis/kampagnen/lead-actions";
import type { LinkedInCampaignLeadStatus } from "@/lib/jarvis/kampagnen/constants";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.company_name === "string") updates.company_name = body.company_name.trim();
  if (typeof body.website === "string") updates.website = body.website.trim() || null;
  if (typeof body.contact_name === "string") updates.contact_name = body.contact_name.trim() || null;
  if (typeof body.linkedin_url === "string") updates.linkedin_url = body.linkedin_url.trim() || null;
  if (typeof body.category === "string") updates.category = body.category.trim() || null;
  if (body.lead_score != null) updates.lead_score = Number(body.lead_score) || null;
  if (typeof body.next_step === "string") updates.next_step = body.next_step.trim() || null;
  if (typeof body.notes === "string") updates.notes = body.notes.trim() || null;
  if (typeof body.suggested_message === "string") {
    updates.suggested_message = body.suggested_message;
  }

  if (typeof body.status === "string") {
    Object.assign(updates, statusUpdateFields(body.status as LinkedInCampaignLeadStatus));
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_campaign_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
