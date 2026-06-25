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

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.active !== undefined) updates.active = body.active;
  if (body.priority) updates.priority = body.priority;
  if (body.name) updates.name = body.name;

  const { data, error } = await supabase
    .from("traffic_target_groups")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  await logJarvisEvent(supabase, {
    event_type: "traffic_target_group_updated",
    entity_type: "traffic_target_group",
    entity_id: id,
    summary: `Zielgruppe aktualisiert: ${data.name}`,
    details: updates,
  });

  return NextResponse.json({ group: data });
}
