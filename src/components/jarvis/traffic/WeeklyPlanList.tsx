"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { TrafficTask } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type TaskWithCampaign = TrafficTask & {
  campaign?: { name: string } | null;
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-600",
};

export function WeeklyPlanList({ tasks }: { tasks: TaskWithCampaign[] }) {
  const router = useRouter();

  async function completeTask(id: string) {
    await fetch(`/api/jarvis/traffic/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    router.refresh();
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Keine offenen Aufgaben im Wochenplan. Kampagne anlegen oder Standard-Daten laden.
      </p>
    );
  }

  const grouped = tasks.reduce<Record<string, TaskWithCampaign[]>>((acc, task) => {
    const key = task.due_date
      ? new Date(task.due_date).toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })
      : "Ohne Datum";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([day, dayTasks]) => (
        <div key={day}>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">{day}</h3>
          <div className="space-y-3">
            {dayTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  <Badge className={priorityColors[task.priority] ?? priorityColors.medium}>
                    {task.priority}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.description && (
                    <p className="text-sm text-slate-600">{task.description}</p>
                  )}
                  {task.campaign?.name && (
                    <p className="text-xs text-slate-500">Kampagne: {task.campaign.name}</p>
                  )}
                  {task.due_date && (
                    <p className="text-xs text-slate-400">Fällig: {formatDate(task.due_date)}</p>
                  )}
                  <Button size="sm" variant="outline" onClick={() => completeTask(task.id)}>
                    Erledigt
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
