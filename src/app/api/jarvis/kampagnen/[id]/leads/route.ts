import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { buildMessageFromTemplate, buildLinkedInMessageSuggestion } from "@/lib/jarvis/kampagnen/message-suggestions";
import { getCampaignTemplate } from "@/lib/jarvis/kampagnen/templates";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id: campaignId } = await params;
  const body = await request.json();
  const company_name = typeof body.company_name === "string" ? body.company_name.trim() : "";

  if (!company_name) {
    return NextResponse.json({ error: "Firmenname fehlt" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("linkedin_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  let suggested_message = body.suggested_message?.trim() || null;
  if (!suggested_message && campaign) {
    const template = campaign.template_key
      ? getCampaignTemplate(campaign.template_key)
      : undefined;
    suggested_message = template
      ? buildMessageFromTemplate(template, company_name, body.contact_name)
      : buildLinkedInMessageSuggestion({
          company_name,
          contact_name: body.contact_name,
          target_group: campaign.target_group,
          campaign_goal: campaign.goal,
        });
  }

  const { data, error } = await supabase
    .from("linkedin_campaign_leads")
    .insert({
      campaign_id: campaignId,
      company_name,
      website: body.website?.trim() || null,
      contact_name: body.contact_name?.trim() || null,
      linkedin_url: body.linkedin_url?.trim() || null,
      category: body.category?.trim() || campaign?.target_group || null,
      lead_score: body.lead_score != null ? Number(body.lead_score) : null,
      status: body.status ?? "new",
      next_step: body.next_step?.trim() || "Recherchieren und LinkedIn-Profil prüfen",
      notes: body.notes?.trim() || null,
      suggested_message,
      b2b_outreach_lead_id: body.b2b_outreach_lead_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
