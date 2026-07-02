import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { contentHubToPublishingRow } from "@/lib/jarvis/linkedin-publishing/import-from-hub";
import type { ContentHubPost } from "@/lib/types";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const ids: string[] = Array.isArray(body.content_hub_post_ids)
    ? body.content_hub_post_ids
    : body.content_hub_post_id
      ? [body.content_hub_post_id]
      : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Keine Content-Hub-Beiträge ausgewählt" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: hubPosts, error: hubError } = await supabase
    .from("content_hub_posts")
    .select("*")
    .in("id", ids);

  if (hubError) {
    return NextResponse.json({ error: getDbErrorMessage(hubError) }, { status: 500 });
  }

  if (!hubPosts?.length) {
    return NextResponse.json({ error: "Beiträge nicht gefunden" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("linkedin_publishing_posts")
    .select("content_hub_post_id")
    .in("content_hub_post_id", ids);

  const alreadyImported = new Set(
    (existing ?? []).map((r) => r.content_hub_post_id).filter(Boolean)
  );

  const toImport = (hubPosts as ContentHubPost[]).filter((p) => !alreadyImported.has(p.id));
  if (toImport.length === 0) {
    return NextResponse.json(
      { error: "Alle ausgewählten Beiträge wurden bereits importiert", skipped: ids.length },
      { status: 409 }
    );
  }

  const rows = toImport.map((post) => contentHubToPublishingRow(post, access.userId));
  const { data, error } = await supabase.from("linkedin_publishing_posts").insert(rows).select();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({
    posts: data,
    imported: data?.length ?? 0,
    skipped: ids.length - toImport.length,
  });
}
