"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Filter, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { TaskFilter, TaskItem, TaskPriority, TaskStatus } from "@/lib/tasks/types";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "@/lib/tasks/types";
import { cn, formatDate } from "@/lib/utils";

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: "mine", label: "Meine Aufgaben" },
  { key: "all", label: "Alle Aufgaben" },
  { key: "overdue", label: "Überfällig" },
  { key: "critical", label: "Kritisch" },
  { key: "waiting_evidence", label: "Wartet auf Nachweis" },
  { key: "completed", label: "Erledigt" },
];

function statusColor(status: TaskStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "waiting_evidence":
      return "bg-amber-100 text-amber-800";
    case "overdue":
      return "bg-orange-100 text-orange-800";
    case "blocked":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function priorityColor(p: TaskPriority): string {
  if (p === "critical") return "text-red-600";
  if (p === "high") return "text-orange-600";
  if (p === "medium") return "text-amber-600";
  return "text-slate-500";
}

interface TasksClientProps {
  companyId: string;
  initialTaskId?: string | null;
}

export function TasksClient({ companyId, initialTaskId }: TasksClientProps) {
  const [filter, setFilter] = useState<TaskFilter>("mine");
  const [sort, setSort] = useState<"due_date" | "priority" | "status">("due_date");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TaskItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tasks?companyId=${companyId}&filter=${filter}&sort=${sort}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks ?? []);
      if (initialTaskId) {
        const found = (data.tasks as TaskItem[]).find((t) => t.id === initialTaskId);
        if (found) setSelected(found);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, filter, sort, initialTaskId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function completeTask(task: TaskItem) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          taskId: task.id,
          action: "complete",
        }),
      });
      const data = await res.json();
      if (data.waitingEvidence || data.message) {
        setMessage(data.message ?? "Nachweis erforderlich");
      }
      void load();
      if (data.task) setSelected(data.task);
    } finally {
      setSaving(false);
    }
  }

  async function uploadEvidence(task: TaskItem) {
    if (!evidenceTitle.trim()) {
      setMessage("Bitte Titel für den Nachweis angeben.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          taskId: task.id,
          title: evidenceTitle,
          evidenceType: evidenceLink ? "link" : "text",
          externalLink: evidenceLink || null,
          relatedType: task.related_type,
          relatedId: task.related_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Upload fehlgeschlagen");
        return;
      }
      setEvidenceTitle("");
      setEvidenceLink("");
      setMessage("Nachweis gespeichert.");
      void load();
      if (data.task) setSelected(data.task);
    } finally {
      setSaving(false);
    }
  }

  async function syncAutoTasks() {
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, action: "sync_auto" }),
    });
    void load();
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 active:scale-95",
                filter === f.key
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-500/30"
                  : "bg-slate-100 text-slate-600 hover:-translate-y-0.5 hover:bg-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            className="rounded border border-slate-200 px-2 py-1 text-xs"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="due_date">Frist</option>
            <option value="priority">Priorität</option>
            <option value="status">Status</option>
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => void syncAutoTasks()} disabled={saving}>
            Auto-Sync
          </Button>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{message}</p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-slate-500">
                  Keine Aufgaben in dieser Ansicht.
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelected(task)}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-colors hover:border-brand-300",
                    selected?.id === task.id ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {TASK_TYPE_LABELS[task.task_type]} ·{" "}
                        <span className={priorityColor(task.priority)}>
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </span>
                      </p>
                    </div>
                    <Badge className={statusColor(task.status)}>
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                  {task.due_date ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      Frist: {formatDate(task.due_date)}
                    </p>
                  ) : null}
                </button>
              ))
            )}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selected.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {selected.description ? (
                    <p className="text-slate-600">{selected.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={statusColor(selected.status)}>
                      {TASK_STATUS_LABELS[selected.status]}
                    </Badge>
                    {selected.evidence_required ? (
                      <Badge className="bg-purple-100 text-purple-800">Nachweis erforderlich</Badge>
                    ) : null}
                  </div>
                  {selected.due_date ? (
                    <p className="text-slate-600">Frist: {formatDate(selected.due_date)}</p>
                  ) : null}
                  {selected.next_reminder_at ? (
                    <p className="text-xs text-slate-500">
                      Nächste Erinnerung: {formatDate(selected.next_reminder_at)}
                    </p>
                  ) : null}

                  {selected.status !== "completed" ? (
                    <Button
                      type="button"
                      onClick={() => void completeTask(selected)}
                      disabled={saving}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="ml-2">Als erledigt markieren</span>
                    </Button>
                  ) : null}

                  {selected.evidence_required && selected.status !== "completed" ? (
                    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">Nachweis hinzufügen</p>
                      <input
                        className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Titel des Nachweises"
                        value={evidenceTitle}
                        onChange={(e) => setEvidenceTitle(e.target.value)}
                      />
                      <input
                        className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Link (optional)"
                        value={evidenceLink}
                        onChange={(e) => setEvidenceLink(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void uploadEvidence(selected)}
                        disabled={saving}
                      >
                        <Upload className="h-4 w-4" />
                        <span className="ml-2">Nachweis speichern</span>
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-slate-500">
                  Aufgabe auswählen für Details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
