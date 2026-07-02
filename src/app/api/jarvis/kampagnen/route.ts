import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const target_group =
    typeof body.target_group === "string" ? body.target_group.trim() : "";

  if (!name || !target_group) {
    return NextResponse.json(
      { error: "Kampagnenname und Zielgruppe sind erforderlich" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_campaigns")
    .insert({
      name,
      target_group,
      description: body.description?.trim() || null,
      status: body.status ?? "draft",
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      responsible: body.responsible?.trim() || "Nico",
      pipeline_value: body.pipeline_value ?? 0,
      template_key: body.template_key || null,
      goal: body.goal?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ campaign: data });
}
