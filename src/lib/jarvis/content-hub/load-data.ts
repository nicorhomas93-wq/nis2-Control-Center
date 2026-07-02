import { createClient } from "@/lib/supabase/server";
import type { ContentHubPost, ContentHubSeries } from "@/lib/types";

export interface ContentHubPageData {
  posts: ContentHubPost[];
  series: ContentHubSeries[];
  error: string | null;
  missingTable: boolean;
}

export async function loadContentHubData(): Promise<ContentHubPageData> {
  const supabase = await createClient();

  const [postsRes, seriesRes] = await Promise.all([
    supabase
      .from("content_hub_posts")
      .select("*, series:content_hub_series(id, name, slug)")
      .order("created_at", { ascending: false }),
    supabase.from("content_hub_series").select("*").order("created_at", { ascending: false }),
  ]);

  const error = postsRes.error?.message ?? seriesRes.error?.message ?? null;
  const missingTable = Boolean(
    postsRes.error?.message?.includes("content_hub_posts") || postsRes.error?.code === "42P01"
  );

  return {
    posts: (postsRes.data ?? []) as ContentHubPost[],
    series: (seriesRes.data ?? []) as ContentHubSeries[],
    error,
    missingTable,
  };
}
