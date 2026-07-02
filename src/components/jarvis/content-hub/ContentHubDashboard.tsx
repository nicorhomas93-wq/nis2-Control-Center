"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Layers, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ContentHubPostCard } from "@/components/jarvis/content-hub/ContentHubPostCard";
import {
  CONTENT_CATEGORY_LABELS,
  CONTENT_FORMAT_LABELS,
  CONTENT_HUB_DISCLAIMER,
  type ContentCategory,
  type ContentFormat,
  type ContentHubArea,
} from "@/lib/jarvis/content-hub/constants";
import { CONTENT_SERIES } from "@/lib/jarvis/content-hub/templates";
import type { ContentHubPost, ContentHubSeries } from "@/lib/types";

interface ContentHubDashboardProps {
  posts: ContentHubPost[];
  series: ContentHubSeries[];
}

export function ContentHubDashboard({ posts, series }: ContentHubDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const areaFilter = searchParams.get("area");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genCategory, setGenCategory] = useState<ContentCategory>("problem_based");
  const [genFormat, setGenFormat] = useState<ContentFormat>("standard_post");
  const [genArea, setGenArea] = useState<ContentHubArea>("linkedin_posts");

  const filtered = useMemo(() => {
    if (!areaFilter || areaFilter === "all") return posts;
    return posts.filter((p) => p.hub_area === areaFilter);
  }, [posts, areaFilter]);

  async function apiCall(url: string, method: string, body?: unknown) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Anfrage fehlgeschlagen");
      router.refresh();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function generateSingle() {
    await apiCall("/api/jarvis/content-hub/generate", "POST", {
      category: genCategory,
      format: genFormat,
      hub_area: genArea,
    });
  }

  async function generateBatch() {
    await apiCall("/api/jarvis/content-hub/generate", "POST", { mode: "batch", count: 5 });
  }

  async function generateCalendar(days: 7 | 14 | 30 | 90) {
    await apiCall("/api/jarvis/content-hub/calendar", "POST", { days });
  }

  async function generateSeries(slug: string) {
    await apiCall("/api/jarvis/content-hub/series", "POST", { slug });
  }

  async function updatePostStatus(id: string, status: string) {
    await apiCall(`/api/jarvis/content-hub/posts/${id}`, "PATCH", { status });
  }

  async function deletePost(id: string) {
    if (!confirm("Beitrag wirklich löschen?")) return;
    await apiCall(`/api/jarvis/content-hub/posts/${id}`, "DELETE");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Sparkles className="mb-1 inline h-4 w-4 text-brand-600" /> {CONTENT_HUB_DISCLAIMER}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4" /> Content erzeugen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Kategorie</span>
                <select
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value as ContentCategory)}
                >
                  {Object.entries(CONTENT_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Format</span>
                <select
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  value={genFormat}
                  onChange={(e) => setGenFormat(e.target.value as ContentFormat)}
                >
                  {Object.entries(CONTENT_FORMAT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Bereich</span>
                <select
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  value={genArea}
                  onChange={(e) => setGenArea(e.target.value as ContentHubArea)}
                >
                  <option value="linkedin_posts">LinkedIn</option>
                  <option value="audit_tips">Audit Tipps</option>
                  <option value="ceo_content">GF-Content</option>
                  <option value="industry">Branche / Systemhaus</option>
                  <option value="mini_cases">Mini Cases</option>
                  <option value="polls">Umfragen</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={generateSingle} disabled={loading}>
                Einzelbeitrag
              </Button>
              <Button type="button" variant="outline" onClick={generateBatch} disabled={loading}>
                5 Ideen (Mix)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  apiCall("/api/jarvis/content-hub/generate", "POST", { mode: "poll" })
                }
                disabled={loading}
              >
                Umfrage
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  apiCall("/api/jarvis/content-hub/generate", "POST", { mode: "mini_case" })
                }
                disabled={loading}
              >
                Mini Case
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Content-Kalender
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-slate-500">
              40% Probleme · 20% Tipps · 20% Cases · 10% Umfragen · 10% Einblicke
            </p>
            {([7, 14, 30, 90] as const).map((d) => (
              <Button
                key={d}
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={loading}
                onClick={() => generateCalendar(d)}
              >
                {d} Tage planen
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" /> Kampagnenserien
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {CONTENT_SERIES.map((s) => {
            const existing = series.find((x) => x.slug === s.slug);
            return (
              <div
                key={s.slug}
                className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2"
              >
                <div>
                  <p className="font-medium text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.days.length} Beiträge</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={existing ? "outline" : "primary"}
                  disabled={loading}
                  onClick={() => generateSeries(s.slug)}
                >
                  {existing ? "Serie erneut erzeugen" : "Serie erzeugen"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Beiträge ({filtered.length}
          {areaFilter ? ` · ${areaFilter}` : ""})
        </h3>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">
            Noch keine Beiträge. Oben Content erzeugen oder eine Serie starten.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((post) => (
              <ContentHubPostCard
                key={post.id}
                post={post}
                onStatusChange={updatePostStatus}
                onDelete={deletePost}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
