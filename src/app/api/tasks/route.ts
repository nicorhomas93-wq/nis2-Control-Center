import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyPermission } from "@/lib/team/access";
import { hasPermission } from "@/lib/team/permissions";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  completeTask,
  createTaskIfNotExists,
  filterTasksForRole,
  loadCompanyTasks,
  refreshOverdueTasks,
  sortTasks,
} from "@/lib/tasks/service";
import { runAutoTasksForCompany, autoTaskFromMeasure, autoTaskFromRisk } from "@/lib/tasks/generate";
import { loadCompanyComplianceData, syncAndReturnComplianceSnapshot } from "@/lib/compliance/sync";
import { logActivity } from "@/lib/activity/log";
import type { TaskFilter } from "@/lib/tasks/types";
import { isTaskOpen } from "@/lib/tasks/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const filter = (searchParams.get("filter") ?? "all") as TaskFilter;
  const sortBy = (searchParams.get("sort") ?? "due_date") as "due_date" | "priority" | "status" | "assignee";

  if (!companyId) return NextResponse.json({ error: "companyId fehlt" }, { status: 400 });

  const access = await requireCompanyPermission(user.id, companyId, "company.read");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await refreshOverdueTasks(supabase, companyId);
  let tasks = await loadCompanyTasks(supabase, companyId);

  const canReadAll = hasPermission(access.role, "tasks.read_all");
  tasks = filterTasksForRole(tasks, user.id, canReadAll);

  if (filter === "mine") {
    tasks = tasks.filter((t) => t.assigned_to === user.id);
  } else if (filter === "overdue") {
    tasks = tasks.filter((t) => t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date() && isTaskOpen(t.status)));
  } else if (filter === "critical") {
    tasks = tasks.filter((t) => t.priority === "critical" && isTaskOpen(t.status));
  } else if (filter === "waiting_evidence") {
    tasks = tasks.filter((t) => t.status === "waiting_evidence");
  } else if (filter === "completed") {
    tasks = tasks.filter((t) => t.status === "completed");
  } else {
    tasks = tasks.filter((t) => isTaskOpen(t.status));
  }

  tasks = sortTasks(tasks, sortBy);

  return NextResponse.json({ tasks, role: access.role });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, action } = body;

  if (!companyId) return NextResponse.json({ error: "companyId fehlt" }, { status: 400 });

  const access = await requireCompanyPermission(user.id, companyId, "tasks.write");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (action === "sync_auto") {
    const data = await loadCompanyComplianceData(supabase, companyId);
    await runAutoTasksForCompany(supabase, companyId, data, user.id);
    const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
    return NextResponse.json({ ok: true, snapshot });
  }

  const {
    title,
    description,
    taskType,
    priority,
    dueDate,
    assignedTo,
    evidenceRequired,
    relatedType,
    relatedId,
  } = body;

  if (!title || !taskType) {
    return NextResponse.json({ error: "title und taskType erforderlich" }, { status: 400 });
  }

  const task = await createTaskIfNotExists(supabase, {
    companyId,
    title,
    description,
    taskType,
    priority,
    dueDate,
    assignedTo,
    createdBy: user.id,
    evidenceRequired,
    relatedType,
    relatedId,
  });

  if (!task) {
    return NextResponse.json({ error: "Aufgabe konnte nicht erstellt werden" }, { status: 500 });
  }

  await logActivity(supabase, {
    companyId,
    userId: user.id,
    action: "task_created",
    entityType: "task",
    entityId: task.id,
    newValue: { title: task.title },
  });

  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return NextResponse.json({ task, snapshot });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, taskId, status, assignedTo, dueDate, priority, completionNote, action } = body;

  if (!companyId || !taskId) {
    return NextResponse.json({ error: "companyId und taskId erforderlich" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "company.read");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (action === "complete" || status === "completed") {
    const canComplete =
      hasPermission(access.role, "tasks.write") || hasPermission(access.role, "tasks.complete_own");
    if (!canComplete) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const result = await completeTask(supabase, taskId, user.id, completionNote);
    if (result.error && !result.task) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
    return NextResponse.json({
      task: result.task,
      waitingEvidence: result.waitingEvidence,
      message: result.error,
      snapshot,
    });
  }

  if (!hasPermission(access.role, "tasks.write")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (assignedTo !== undefined) updates.assigned_to = assignedTo;
  if (dueDate !== undefined) updates.due_date = dueDate;
  if (priority) updates.priority = priority;

  const { data: task, error } = await supabase
    .from("task_items")
    .update(updates)
    .eq("id", taskId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: 500 }
    );
  }

  await logActivity(supabase, {
    companyId,
    userId: user.id,
    action: status ? "status_changed" : assignedTo !== undefined ? "assignee_changed" : "task_updated",
    entityType: "task",
    entityId: taskId,
    newValue: updates,
  });

  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return NextResponse.json({ task, snapshot });
}

// Re-export hooks for measure/risk routes
export { autoTaskFromMeasure, autoTaskFromRisk };
