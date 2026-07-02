import { CONTENT_SERIES } from "@/lib/jarvis/content-hub/templates";
import { generateSeriesDayPost } from "@/lib/jarvis/content-hub/generator";
import type { GeneratedPost } from "@/lib/jarvis/content-hub/templates";

export interface SeriesBuildResult {
  series: (typeof CONTENT_SERIES)[number];
  posts: Array<GeneratedPost & { day_number: number }>;
}

export function getSeriesDefinitions() {
  return CONTENT_SERIES;
}

export function buildSeriesBySlug(slug: string): SeriesBuildResult | null {
  const series = CONTENT_SERIES.find((s) => s.slug === slug);
  if (!series) return null;

  const posts = series.days.map((day) => ({
    ...generateSeriesDayPost(series.slug, day.day, day.topic, day.title, day.category),
    day_number: day.day,
  }));

  return { series, posts };
}
