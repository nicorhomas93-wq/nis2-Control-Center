import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import {
  publishLinkedInImagePost,
  publishLinkedInTextPost,
} from "@/lib/jarvis/linkedin-publishing/linkedin-api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const { id } = await params;
  const supabase = await createClient();

  const [postRes, accountRes] = await Promise.all([
    supabase.from("linkedin_publishing_posts").select("*").eq("id", id).single(),
    supabase
      .from("linkedin_publishing_accounts")
      .select("*")
      .eq("user_id", access.userId)
      .maybeSingle(),
  ]);

  if (postRes.error || !postRes.data) {
    return NextResponse.json({ error: "Beitrag nicht gefunden" }, { status: 404 });
  }

  const post = postRes.data;
  const account = accountRes.data;

  if (!account?.is_active || !account.access_token || !account.linkedin_member_id) {
    return NextResponse.json(
      { error: "LinkedIn ist nicht verbunden. Bitte zuerst Account verbinden." },
      { status: 400 }
    );
  }

  if (post.status === "published") {
    return NextResponse.json({ error: "Beitrag wurde bereits veröffentlicht." }, { status: 400 });
  }

  try {
    const result = post.image_url
      ? await publishLinkedInImagePost({
          accessToken: account.access_token,
          memberId: account.linkedin_member_id,
          text: post.body_text,
          imageUrl: post.image_url,
          cta: post.call_to_action,
          hashtags: post.hashtags,
        })
      : await publishLinkedInTextPost({
          accessToken: account.access_token,
          memberId: account.linkedin_member_id,
          text: post.body_text,
          cta: post.call_to_action,
          hashtags: post.hashtags,
        });

    const { data, error } = await supabase
      .from("linkedin_publishing_posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        linkedin_post_urn: result.urn,
        publish_error: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ post: data, urn: result.urn });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Veröffentlichung fehlgeschlagen";
    await supabase
      .from("linkedin_publishing_posts")
      .update({ status: "failed", publish_error: message })
      .eq("id", id);

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
