import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { canSchedulePost, logContentAudit } from "@/lib/jarvis/linkedin-publishing/approval";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("linkedin_publishing_posts")
    .select("status, title, campaign_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Beitrag nicht gefunden" }, { status: 404 });
  }

  if (["published"].includes(existing.status)) {
    return NextResponse.json({ error: "Veröffentlichte Beiträge können nicht geändert werden." }, { status: 400 });
  }

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
  if (body.campaign_id === null || typeof body.campaign_id === "string") {
    updates.campaign_id = body.campaign_id;
  }
  if (typeof body.reach_views === "number") updates.reach_views = body.reach_views;
  if (typeof body.response_count === "number") updates.response_count = body.response_count;

  if (body.scheduled_at === null || typeof body.scheduled_at === "string") {
    updates.scheduled_at = body.scheduled_at;
    if (body.scheduled_at && canSchedulePost(existing.status)) {
      updates.status = "scheduled";
    } else if (body.scheduled_at && !canSchedulePost(existing.status)) {
      return NextResponse.json(
        { error: "Planung erst nach Freigabe möglich. Geplantes Datum wird als Entwurf gespeichert." },
        { status: 400 }
      );
    }
  }

  if (typeof body.status === "string" && body.status === "scheduled") {
    if (!canSchedulePost(existing.status)) {
      return NextResponse.json(
        { error: "Planung erst nach Freigabe möglich." },
        { status: 403 }
      );
    }
    updates.status = "scheduled";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("linkedin_publishing_posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  if (updates.status === "scheduled") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", access.userId)
      .maybeSingle();
    await logContentAudit({
      entity_type: "post",
      entity_id: id,
      action: "scheduled",
      actor: profile?.email ?? "Nico",
      campaign_id: existing.campaign_id,
      metadata: { title: existing.title, scheduled_at: updates.scheduled_at },
    });
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
