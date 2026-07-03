import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import {
  logContentAudit,
  statusAfterApproval,
} from "@/lib/jarvis/linkedin-publishing/approval";

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

  if (!["draft", "pending_approval"].includes(post.status)) {
    return NextResponse.json(
      { error: "Nur Entwürfe oder Beiträge zur Freigabe können freigegeben werden." },
      { status: 400 }
    );
  }

  const hasFutureSchedule =
    post.scheduled_at && new Date(post.scheduled_at).getTime() > Date.now();
  const newStatus = statusAfterApproval(Boolean(hasFutureSchedule));

  const { data, error } = await supabase
    .from("linkedin_publishing_posts")
    .update({
      status: newStatus,
      approved_by: actor,
      approved_at: new Date().toISOString(),
      publish_error: null,
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
    action: "approved",
    actor,
    campaign_id: post.campaign_id,
    metadata: { title: post.title, new_status: newStatus },
  });

  return NextResponse.json({ post: data });
}
