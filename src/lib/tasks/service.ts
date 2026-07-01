import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskItem, TaskPriority, TaskStatus, TaskType } from "@/lib/tasks/types";
import { isTaskOpen } from "@/lib/tasks/types";
import { logActivity } from "@/lib/activity/log";
import { createNotification } from "@/lib/notifications/service";
import { syncAndReturnComplianceSnapshot } from "@/lib/compliance/sync";

export interface CreateTaskInput {
  companyId: string;
  title: string;
  description?: string;
  taskType: TaskType;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  evidenceRequired?: boolean;
  relatedType?: string | null;
  relatedId?: string | null;
}

export async function findOpenTaskForRelated(
  supabase: SupabaseClient,
  companyId: string,
  relatedType: string,
  relatedId: string
): Promise<TaskItem | null> {
  const { data } = await supabase
    .from("task_items")
    .select("*")
    .eq("company_id", companyId)
    .eq("related_type", relatedType)
    .eq("related_id", relatedId)
    .is("deleted_at", null)
    .in("status", ["open", "in_progress", "waiting_evidence", "overdue", "blocked"])
    .maybeSingle();

  return (data as TaskItem) ?? null;
}

export async function createTaskIfNotExists(
  supabase: SupabaseClient,
  input: CreateTaskInput
): Promise<TaskItem | null> {
  if (input.relatedType && input.relatedId) {
    const existing = await findOpenTaskForRelated(
      supabase,
      input.companyId,
      input.relatedType,
      input.relatedId
    );
    if (existing) return existing;
  }

  const { data, error } = await supabase
    .from("task_items")
    .insert({
      company_id: input.companyId,
      title: input.title,
      description: input.description ?? null,
      task_type: input.taskType,
      priority: input.priority ?? "medium",
      status: "open",
      due_date: input.dueDate ?? null,
      assigned_to: input.assignedTo ?? null,
      created_by: input.createdBy ?? null,
      evidence_required: Boolean(input.evidenceRequired),
      related_type: input.relatedType ?? null,
      related_id: input.relatedId ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("createTaskIfNotExists:", error);
    return null;
  }

  const task = data as TaskItem;

  if (task.assigned_to) {
    await createNotification(supabase, {
      companyId: input.companyId,
      userId: task.assigned_to,
      title: "Neue Aufgabe zugewiesen",
      message: task.title,
      notificationType: "task_assigned",
      severity: task.priority === "critical" ? "critical" : "info",
      relatedType: "task",
      relatedId: task.id,
      linkPath: `/aufgaben?task=${task.id}`,
    });
  }

  return task;
}

export async function hasTaskEvidence(
  supabase: SupabaseClient,
  taskId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("evidence_items")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .is("deleted_at", null);

  return (count ?? 0) > 0;
}

export async function completeTask(
  supabase: SupabaseClient,
  taskId: string,
  userId: string,
  completionNote?: string
): Promise<{ task: TaskItem | null; error?: string; waitingEvidence?: boolean }> {
  const { data: task } = await supabase
    .from("task_items")
    .select("*")
    .eq("id", taskId)
    .is("deleted_at", null)
    .single();

  if (!task) return { task: null, error: "Aufgabe nicht gefunden" };

  const item = task as TaskItem;

  if (item.evidence_required) {
    const hasEvidence = await hasTaskEvidence(supabase, taskId);
    if (!hasEvidence) {
      const { data: updated } = await supabase
        .from("task_items")
        .update({ status: "waiting_evidence", updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .select()
        .single();

      await logActivity(supabase, {
        companyId: item.company_id,
        userId,
        action: "task_waiting_evidence",
        entityType: "task",
        entityId: taskId,
        comment: "Nachweis fehlt — Aufgabe nicht vollständig abgeschlossen",
      });

      return {
        task: (updated as TaskItem) ?? item,
        waitingEvidence: true,
        error:
          "Diese Aufgabe benötigt einen Nachweis, bevor sie abgeschlossen werden kann.",
      };
    }
  }

  const now = new Date().toISOString();
  const { data: completed, error } = await supabase
    .from("task_items")
    .update({
      status: "completed",
      completed_by: userId,
      completed_at: now,
      completion_note: completionNote ?? null,
      updated_at: now,
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) return { task: null, error: error.message };

  await logActivity(supabase, {
    companyId: item.company_id,
    userId,
    action: "task_completed",
    entityType: "task",
    entityId: taskId,
    oldValue: { status: item.status },
    newValue: { status: "completed" },
    comment: completionNote,
  });

  await syncAndReturnComplianceSnapshot(supabase, item.company_id);

  return { task: completed as TaskItem };
}

export async function refreshOverdueTasks(
  supabase: SupabaseClient,
  companyId: string
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("task_items")
    .update({ status: "overdue", updated_at: now })
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .in("status", ["open", "in_progress", "waiting_evidence", "blocked"])
    .lt("due_date", now);
}

export function filterTasksForRole(
  tasks: TaskItem[],
  userId: string,
  canReadAll: boolean
): TaskItem[] {
  if (canReadAll) return tasks;
  return tasks.filter((t) => t.assigned_to === userId);
}

export function sortTasks(
  tasks: TaskItem[],
  sortBy: "due_date" | "priority" | "status" | "assignee" = "due_date"
): TaskItem[] {
  const priorityWeight: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  const statusWeight: Record<string, number> = {
    overdue: 6,
    blocked: 5,
    waiting_evidence: 4,
    in_progress: 3,
    open: 2,
    completed: 1,
  };

  return [...tasks].sort((a, b) => {
    if (sortBy === "priority") {
      return (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0);
    }
    if (sortBy === "status") {
      return (statusWeight[b.status] ?? 0) - (statusWeight[a.status] ?? 0);
    }
    if (sortBy === "assignee") {
      return (a.assigned_to ?? "").localeCompare(b.assigned_to ?? "");
    }
    const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return aDue - bDue;
  });
}

export async function loadCompanyTasks(
  supabase: SupabaseClient,
  companyId: string
): Promise<TaskItem[]> {
  const { data } = await supabase
    .from("task_items")
    .select("*")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as TaskItem[];
}

export function countOpenTasks(tasks: TaskItem[]): { open: number; overdue: number; critical: number } {
  let open = 0;
  let overdue = 0;
  let critical = 0;
  for (const t of tasks) {
    if (!isTaskOpen(t.status)) continue;
    open += 1;
    if (t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date())) {
      overdue += 1;
    }
    if (t.priority === "critical") critical += 1;
  }
  return { open, overdue, critical };
}
