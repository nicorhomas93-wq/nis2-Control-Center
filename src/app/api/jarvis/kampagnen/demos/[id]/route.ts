import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
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
  if (typeof body.contact_name === "string") updates.contact_name = body.contact_name.trim() || null;
  if (typeof body.scheduled_at === "string") updates.scheduled_at = body.scheduled_at || null;
  if (typeof body.status === "string") updates.status = body.status;
  if (typeof body.result === "string") updates.result = body.result.trim() || null;
  if (typeof body.notes === "string") updates.notes = body.notes.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_campaign_demos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  if (data.lead_id && body.status) {
    const leadStatus =
      body.status === "won"
        ? "won"
        : body.status === "lost"
          ? "lost"
          : body.status === "completed"
            ? "demo_done"
            : body.status === "pilot"
              ? "quote_requested"
              : null;

    if (leadStatus) {
      const leadUpdate: Record<string, unknown> = { status: leadStatus };
      if (body.status === "pilot") leadUpdate.reminder_type = "pilot_running";
      await supabase.from("linkedin_campaign_leads").update(leadUpdate).eq("id", data.lead_id);
    }
  }

  return NextResponse.json({ demo: data });
}
