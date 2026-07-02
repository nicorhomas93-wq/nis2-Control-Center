import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { buildContentCalendar } from "@/lib/jarvis/content-hub/calendar";

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const body = await request.json();
  const days = ([7, 14, 30, 90] as const).includes(body.days) ? body.days : 7;
  const plan = buildContentCalendar(days);

  const supabase = await createClient();
  const rows = plan.map((item) => ({
    title: item.title,
    category: item.category,
    hub_area: item.hub_area,
    format: item.format,
    hook: item.hook,
    body: item.body,
    call_to_action: item.call_to_action,
    poll_question: item.poll_question ?? null,
    poll_options: item.poll_options ?? [],
    word_count: item.word_count,
    tags: item.tags,
    status: "draft",
    scheduled_date: item.scheduled_date,
    day_number: item.day_offset,
  }));

  const { data, error } = await supabase.from("content_hub_posts").insert(rows).select();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ posts: data, days, mix: "40% Probleme, 20% Tipps, 20% Cases, 10% Umfragen, 10% Einblicke" });
}
