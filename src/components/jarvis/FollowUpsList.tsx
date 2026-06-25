"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { SalesTask } from "@/lib/types";

type TaskWithLead = SalesTask & {
  lead?: {
    company_name: string | null;
    contact_name: string | null;
    email: string | null;
  } | null;
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-600",
};

export function FollowUpsList({ tasks }: { tasks: TaskWithLead[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function completeTask(id: string) {
    setLoadingId(id);
    await fetch(`/api/jarvis/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    setLoadingId(null);
    router.refresh();
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-slate-500">Keine offenen Follow-ups.</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <Badge className={priorityColors[task.priority] ?? priorityColors.medium}>
              {task.priority}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.description && (
              <p className="text-sm text-slate-600">{task.description}</p>
            )}
            <p className="text-sm text-slate-500">
              Lead: {task.lead?.company_name ?? "—"} ({task.lead?.email ?? "—"})
            </p>
            {task.due_date && (
              <p className="text-xs text-slate-400">Fällig: {formatDate(task.due_date)}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => completeTask(task.id)}
              disabled={loadingId === task.id}
            >
              Als erledigt markieren
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
