import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { buildSeriesBySlug, getSeriesDefinitions } from "@/lib/jarvis/content-hub/series";

export async function GET() {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  return NextResponse.json({ series: getSeriesDefinitions() });
}

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) {
    return NextResponse.json({ error: "Serien-Slug erforderlich" }, { status: 400 });
  }

  const built = buildSeriesBySlug(slug);
  if (!built) {
    return NextResponse.json({ error: "Serie nicht gefunden" }, { status: 404 });
  }

  const supabase = await createClient();

  const { data: seriesRow, error: seriesError } = await supabase
    .from("content_hub_series")
    .upsert(
      {
        name: built.series.name,
        slug: built.series.slug,
        category: built.series.category,
        hub_area: built.series.hub_area,
        description: built.series.description,
        day_count: built.series.days.length,
        status: "active",
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (seriesError) {
    return NextResponse.json({ error: getDbErrorMessage(seriesError) }, { status: 500 });
  }

  const postRows = built.posts.map((post) => ({
    series_id: seriesRow.id,
    title: post.title,
    category: post.category,
    hub_area: post.hub_area,
    format: post.format,
    hook: post.hook,
    body: post.body,
    call_to_action: post.call_to_action,
    word_count: post.word_count,
    tags: post.tags,
    day_number: post.day_number,
    status: "draft",
  }));

  const { data: posts, error: postsError } = await supabase
    .from("content_hub_posts")
    .insert(postRows)
    .select();

  if (postsError) {
    return NextResponse.json({ error: getDbErrorMessage(postsError) }, { status: 500 });
  }

  return NextResponse.json({ series: seriesRow, posts });
}
