import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { status } = await request.json();

  const { data, error } = await supabase
    .from("outreach_drafts")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  await logJarvisEvent(supabase, {
    event_type: "traffic_outreach_updated",
    entity_type: "outreach_draft",
    entity_id: id,
    summary: `Outreach-Entwurf: Status → ${status}`,
    details: { status, purpose: data.purpose, channel: data.channel },
  });

  return NextResponse.json({ draft: data });
}
