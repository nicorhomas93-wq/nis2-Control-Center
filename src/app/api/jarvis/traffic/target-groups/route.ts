import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("traffic_target_groups")
    .insert({
      name: body.name,
      description: body.description ?? null,
      industry: body.industry ?? null,
      company_size: body.company_size ?? null,
      pain_points: body.pain_points ?? null,
      value_proposition: body.value_proposition ?? null,
      priority: body.priority ?? "medium",
      active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  await logJarvisEvent(supabase, {
    event_type: "traffic_target_group_created",
    entity_type: "traffic_target_group",
    entity_id: data.id,
    summary: `Zielgruppe angelegt: ${data.name}`,
  });

  return NextResponse.json({ group: data });
}
