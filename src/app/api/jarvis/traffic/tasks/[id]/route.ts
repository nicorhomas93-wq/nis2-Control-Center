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
    .from("traffic_tasks")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  await logJarvisEvent(supabase, {
    event_type: "traffic_task_updated",
    entity_type: "traffic_task",
    entity_id: id,
    summary: `Traffic-Aufgabe: ${data.title} → ${status}`,
  });

  return NextResponse.json({ task: data });
}
