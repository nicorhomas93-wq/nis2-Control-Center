import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import type { ContentCategory, ContentFormat, ContentHubArea } from "@/lib/jarvis/content-hub/constants";
import {
  generateBatch,
  generateByCategory,
  generateMiniCase,
  generatePoll,
  generatePostFromSeed,
} from "@/lib/jarvis/content-hub/generator";

function toRow(post: {
  title: string;
  category: string;
  hub_area: string;
  format: string;
  hook: string | null;
  body: string;
  call_to_action: string;
  poll_question?: string | null;
  poll_options?: string[];
  word_count: number;
  tags: string[];
  series_id?: string | null;
  day_number?: number | null;
  scheduled_date?: string | null;
}) {
  return {
    title: post.title,
    category: post.category,
    hub_area: post.hub_area,
    format: post.format,
    hook: post.hook,
    body: post.body,
    call_to_action: post.call_to_action,
    poll_question: post.poll_question ?? null,
    poll_options: post.poll_options ?? [],
    word_count: post.word_count,
    tags: post.tags,
    status: "draft",
    series_id: post.series_id ?? null,
    day_number: post.day_number ?? null,
    scheduled_date: post.scheduled_date ?? null,
  };
}

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const mode = body.mode ?? "single";
  const count = Math.min(Math.max(Number(body.count) || 1, 1), 20);

  let generated = [];

  if (mode === "batch") {
    generated = generateBatch(count);
  } else if (mode === "poll") {
    generated = [generatePoll(Number(body.poll_index) || 0)];
  } else if (mode === "mini_case") {
    generated = [generateMiniCase()];
  } else if (mode === "seed") {
    generated = [
      generatePostFromSeed(
        Number(body.seed_index) || 0,
        (body.format as ContentFormat) ?? "standard_post"
      ),
    ];
  } else {
    const category = (body.category as ContentCategory) ?? "problem_based";
    const format = (body.format as ContentFormat) ?? "standard_post";
    const hub_area = (body.hub_area as ContentHubArea) ?? "linkedin_posts";
    generated = [generateByCategory(category, format, hub_area)];
  }

  const supabase = await createClient();
  const rows = generated.map((p) => toRow(p));
  const { data, error } = await supabase.from("content_hub_posts").insert(rows).select();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ posts: data, count: data?.length ?? 0 });
}
