import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import type { LinkedInPostType } from "@/lib/jarvis/linkedin-publishing/constants";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyText = typeof body.body_text === "string" ? body.body_text.trim() : "";

  if (!title || !bodyText) {
    return NextResponse.json({ error: "Titel und Text sind erforderlich" }, { status: 400 });
  }

  const status = body.status === "scheduled" ? "scheduled" : "draft";
  const scheduledAt =
    status === "scheduled" && body.scheduled_at ? String(body.scheduled_at) : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linkedin_publishing_posts")
    .insert({
      user_id: access.userId,
      content_hub_post_id: body.content_hub_post_id ?? null,
      title,
      post_type: (body.post_type as LinkedInPostType) ?? "short_post",
      body_text: bodyText,
      image_url: body.image_url ?? null,
      image_storage_path: body.image_storage_path ?? null,
      target_audience: body.target_audience?.trim() || null,
      call_to_action: body.call_to_action?.trim() || null,
      hashtags: body.hashtags?.trim() || null,
      status,
      scheduled_at: scheduledAt,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}
