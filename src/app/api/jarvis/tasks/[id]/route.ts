import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";

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

  const { status, title } = await request.json();
  const updates: Record<string, string> = {};
  if (status) updates.status = status;
  if (title) updates.title = title;

  const { data, error } = await supabase
    .from("sales_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  if (status === "done") {
    await logJarvisEvent(supabase, {
      event_type: "task_completed",
      entity_type: "sales_task",
      entity_id: id,
      summary: `Aufgabe erledigt: ${data.title}`,
    });
  }

  return NextResponse.json({ task: data });
}
