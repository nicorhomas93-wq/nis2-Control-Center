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

  if (typeof body.status === "string") updates.status = body.status;
  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.body === "string") updates.body = body.body;
  if (typeof body.call_to_action === "string") updates.call_to_action = body.call_to_action;
  if (body.scheduled_date === null || typeof body.scheduled_date === "string") {
    updates.scheduled_date = body.scheduled_date;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_hub_posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("content_hub_posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
