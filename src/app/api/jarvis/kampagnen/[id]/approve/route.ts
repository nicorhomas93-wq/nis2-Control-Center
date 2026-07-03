import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { logContentAudit } from "@/lib/jarvis/linkedin-publishing/approval";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign, error: fetchError } = await supabase
    .from("linkedin_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !campaign) {
    return NextResponse.json({ error: "Kampagne nicht gefunden" }, { status: 404 });
  }

  if (campaign.approval_status === "approved") {
    return NextResponse.json({ error: "Kampagne ist bereits freigegeben." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", access.userId)
    .maybeSingle();
  const actor = profile?.email ?? "Nico";

  const { data, error } = await supabase
    .from("linkedin_campaigns")
    .update({
      approval_status: "approved",
      approved_by: actor,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  await logContentAudit({
    entity_type: "campaign",
    entity_id: id,
    action: "campaign_approved",
    actor,
    campaign_id: id,
    metadata: { name: campaign.name },
  });

  return NextResponse.json({ campaign: data });
}
