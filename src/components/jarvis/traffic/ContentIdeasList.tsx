import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CONTENT_TYPE_LABELS } from "@/lib/jarvis/traffic/constants";
import type { ContentIdea } from "@/lib/types";

export function ContentIdeasList({ ideas }: { ideas: ContentIdea[] }) {
  if (ideas.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Keine Content-Ideen. Standard-Daten laden oder neue Idee anlegen.
      </p>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2">
      {ideas.map((idea) => (
        <Card key={idea.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{idea.title}</CardTitle>
              <Badge className="bg-slate-100 text-slate-700">{idea.status}</Badge>
            </div>
            <p className="text-xs text-slate-500">
              {idea.platform} ·{" "}
              {CONTENT_TYPE_LABELS[idea.content_type ?? ""] ?? idea.content_type}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {idea.hook && (
              <p>
                <span className="font-medium text-slate-700">Hook: </span>
                {idea.hook}
              </p>
            )}
            {idea.outline && (
              <pre className="whitespace-pre-wrap rounded bg-slate-50 p-2 text-slate-600">
                {idea.outline}
              </pre>
            )}
            {idea.call_to_action && (
              <p className="text-brand-700">CTA: {idea.call_to_action}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
