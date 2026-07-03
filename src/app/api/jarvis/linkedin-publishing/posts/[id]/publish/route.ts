import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import {
  assertCampaignApproved,
  canPublishPost,
  logContentAudit,
} from "@/lib/jarvis/linkedin-publishing/approval";
import {
  formatLinkedInPostText,
  LINKEDIN_FEED_URL,
} from "@/lib/jarvis/linkedin-publishing/post-format";

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

  if (!canPublishPost(post.status)) {
    return NextResponse.json(
      {
        error:
          "Beitrag ist nicht freigegeben. Bitte zuerst prüfen und „Freigeben“ klicken.",
      },
      { status: 403 }
    );
  }

  const campaignCheck = await assertCampaignApproved(post.campaign_id);
  if (!campaignCheck.ok) {
    return NextResponse.json({ error: campaignCheck.error }, { status: 403 });
  }

  if (!account?.is_active || !account.profile_name) {
    return NextResponse.json(
      { error: "Profil nicht eingerichtet. Bitte zuerst LinkedIn-Profil verknüpfen." },
      { status: 400 }
    );
  }

  if (post.status === "published") {
    return NextResponse.json({ error: "Beitrag wurde bereits veröffentlicht." }, { status: 400 });
  }

  const isManual = account.connection_mode === "manual";

  if (isManual) {
    const text = formatLinkedInPostText(post);
    return NextResponse.json({
      manual: true,
      text,
      linkedinUrl: LINKEDIN_FEED_URL,
      message:
        "Text wird kopiert. LinkedIn öffnet sich — dort einfügen und selbst auf „Veröffentlichen“ klicken.",
    });
  }

  if (!account.access_token || !account.linkedin_member_id) {
    return NextResponse.json(
      { error: "API-Verbindung fehlt. Nutzen Sie „Persönliches Profil“ oder OAuth." },
      { status: 400 }
    );
  }

  try {
    const { publishLinkedInImagePost, publishLinkedInTextPost } = await import(
      "@/lib/jarvis/linkedin-publishing/linkedin-api"
    );
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

    await logContentAudit({
      entity_type: "post",
      entity_id: id,
      action: "published",
      actor,
      campaign_id: post.campaign_id,
      metadata: { title: post.title, urn: result.urn, mode: "api" },
    });

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
