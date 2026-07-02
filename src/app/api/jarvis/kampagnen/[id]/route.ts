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

  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.target_group === "string") updates.target_group = body.target_group.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (typeof body.status === "string") updates.status = body.status;
  if (typeof body.start_date === "string") updates.start_date = body.start_date || null;
  if (typeof body.end_date === "string") updates.end_date = body.end_date || null;
  if (typeof body.responsible === "string") updates.responsible = body.responsible.trim();
  if (body.pipeline_value != null) updates.pipeline_value = Number(body.pipeline_value) || 0;
  if (typeof body.goal === "string") updates.goal = body.goal.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ campaign: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("linkedin_campaigns").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
