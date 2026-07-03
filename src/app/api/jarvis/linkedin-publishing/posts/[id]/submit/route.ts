import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { logContentAudit } from "@/lib/jarvis/linkedin-publishing/approval";

async function getActorName(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  return data?.email ?? "Nico";
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;
  const supabase = await createClient();
  const actor = await getActorName(access.userId);

  const { data: post, error: fetchError } = await supabase
    .from("linkedin_publishing_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !post) {
    return NextResponse.json({ error: "Beitrag nicht gefunden" }, { status: 404 });
  }

  if (post.status !== "draft") {
    return NextResponse.json(
      { error: "Nur Entwürfe können zur Freigabe eingereicht werden." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("linkedin_publishing_posts")
    .update({
      status: "pending_approval",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  await logContentAudit({
    entity_type: "post",
    entity_id: id,
    action: "submitted",
    actor,
    campaign_id: post.campaign_id,
    metadata: { title: post.title },
  });

  return NextResponse.json({ post: data });
}
