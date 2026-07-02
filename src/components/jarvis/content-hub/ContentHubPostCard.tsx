"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  CONTENT_CATEGORY_LABELS,
  CONTENT_FORMAT_LABELS,
  CONTENT_HUB_AREA_LABELS,
} from "@/lib/jarvis/content-hub/constants";
import type { ContentHubPost } from "@/lib/types";

function formatPostForCopy(post: ContentHubPost): string {
  const parts = [post.hook, post.body, post.call_to_action ? `\n${post.call_to_action}` : ""].filter(
    Boolean
  );
  return parts.join("\n\n");
}

export function ContentHubPostCard({
  post,
  onStatusChange,
  onDelete,
}: {
  post: ContentHubPost;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(formatPostForCopy(post));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
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
            post.category}{" "}
          ·{" "}
          {CONTENT_FORMAT_LABELS[post.format as keyof typeof CONTENT_FORMAT_LABELS] ?? post.format}
          {post.word_count ? ` · ${post.word_count} Wörter` : ""}
          {post.scheduled_date ? ` · ${post.scheduled_date}` : ""}
        </p>
        {post.series?.name && (
          <p className="text-xs text-brand-700">Serie: {post.series.name}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {post.hook && (
          <p>
            <span className="font-medium text-slate-700">Hook: </span>
            {post.hook}
          </p>
        )}
        <pre className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-slate-700">{post.body}</pre>
        {post.poll_question && post.poll_options && post.poll_options.length > 0 && (
          <div className="rounded border border-slate-200 p-2 text-xs">
            <p className="font-medium">Umfrage: {post.poll_question}</p>
            <ul className="mt-1 list-disc pl-4">
              {post.poll_options.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        )}
        {post.call_to_action && (
          <p className="text-brand-700 font-medium">CTA: {post.call_to_action}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyText}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Kopiert" : "Kopieren"}
          </Button>
          {onStatusChange && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onStatusChange(post.id, post.status === "ready" ? "draft" : "ready")
              }
            >
              {post.status === "ready" ? "Als Entwurf" : "Als bereit markieren"}
            </Button>
          )}
          {onDelete && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(post.id)}>
              Löschen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
