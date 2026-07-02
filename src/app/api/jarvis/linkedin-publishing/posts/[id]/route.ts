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

  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.body_text === "string") updates.body_text = body.body_text;
  if (typeof body.post_type === "string") updates.post_type = body.post_type;
  if (body.image_url === null || typeof body.image_url === "string") updates.image_url = body.image_url;
  if (body.target_audience === null || typeof body.target_audience === "string") {
    updates.target_audience = body.target_audience;
  }
  if (body.call_to_action === null || typeof body.call_to_action === "string") {
    updates.call_to_action = body.call_to_action;
  }
  if (body.hashtags === null || typeof body.hashtags === "string") updates.hashtags = body.hashtags;
  if (typeof body.status === "string") updates.status = body.status;
  if (body.scheduled_at === null || typeof body.scheduled_at === "string") {
    updates.scheduled_at = body.scheduled_at;
  }
  if (typeof body.reach_views === "number") updates.reach_views = body.reach_views;
  if (typeof body.response_count === "number") updates.response_count = body.response_count;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_publishing_posts")
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
  const { error } = await supabase.from("linkedin_publishing_posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
