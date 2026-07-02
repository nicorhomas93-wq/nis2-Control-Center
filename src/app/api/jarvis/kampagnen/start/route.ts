import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getCampaignTemplate } from "@/lib/jarvis/kampagnen/templates";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const templateKey = typeof body.template_key === "string" ? body.template_key : "";
  const template = getCampaignTemplate(templateKey);

  if (!template) {
    return NextResponse.json({ error: "Kampagnen-Vorlage nicht gefunden" }, { status: 400 });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("linkedin_campaigns")
    .insert({
      name: template.name,
      target_group: template.target_group,
      description: template.description,
      goal: template.goal,
      status: "active",
      start_date: today,
      responsible: body.responsible?.trim() || "Nico",
      template_key: template.key,
      pipeline_value: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ campaign: data, message: `Kampagne „${template.name}" gestartet` });
}
