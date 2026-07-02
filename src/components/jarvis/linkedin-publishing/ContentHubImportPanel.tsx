"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  CONTENT_CATEGORY_LABELS,
  CONTENT_HUB_AREA_LABELS,
} from "@/lib/jarvis/content-hub/constants";
import type { ContentHubPost } from "@/lib/types";

interface ContentHubImportPanelProps {
  posts: ContentHubPost[];
  importedIds: Set<string>;
  loading: boolean;
  onImport: (ids: string[]) => Promise<void>;
  onImportAll: (ids: string[]) => Promise<void>;
}

export function ContentHubImportPanel({
  posts,
  importedIds,
  loading,
  onImport,
  onImportAll,
}: ContentHubImportPanelProps) {
  const available = posts.filter((p) => !importedIds.has(p.id));
  const ready = available.filter((p) => p.status === "ready" || p.hub_area === "linkedin_posts");

  if (posts.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Noch keine Content-Hub-Beiträge. Zuerst im{" "}
        <a href="/jarvis/content-hub" className="text-brand-700 hover:underline">
          Content Hub
        </a>{" "}
        Ideen erzeugen.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {available.length} importierbar · {importedIds.size} bereits übernommen
        </p>
        {ready.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onImportAll(ready.map((p) => p.id))}
          >
            Alle bereiten Beiträge importieren ({ready.length})
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {available.map((post) => (
          <Card key={post.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{post.title}</CardTitle>
                <Badge className="bg-slate-100 text-slate-700 shrink-0">{post.status}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {CONTENT_HUB_AREA_LABELS[post.hub_area as keyof typeof CONTENT_HUB_AREA_LABELS] ??
                  post.hub_area}{" "}
                ·{" "}
                {CONTENT_CATEGORY_LABELS[post.category as keyof typeof CONTENT_CATEGORY_LABELS] ??
                  post.category}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <pre className="line-clamp-4 whitespace-pre-wrap rounded bg-slate-50 p-2 text-slate-700">
                {post.body}
              </pre>
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={() => onImport([post.id])}
              >
                In Publishing übernehmen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {available.length === 0 && (
        <p className="text-sm text-slate-500">Alle Content-Hub-Beiträge sind bereits importiert.</p>
      )}
    </div>
  );
}
