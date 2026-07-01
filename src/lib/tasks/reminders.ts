import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskItem } from "@/lib/tasks/types";
import { isTaskOpen } from "@/lib/tasks/types";
import { createNotification } from "@/lib/notifications/service";
import { queueEmailNotification } from "@/lib/email/queue";

const REMINDER_DAYS = [7, 3, 0];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / (86400000));
}

function reminderKey(taskId: string, kind: string): string {
  return `${taskId}:${kind}`;
}

export async function processTaskReminders(
  supabase: SupabaseClient,
  companyId: string,
  tasks: TaskItem[]
): Promise<number> {
  const now = new Date();
  let sent = 0;

  for (const task of tasks) {
    if (!isTaskOpen(task.status) || !task.reminders_enabled || !task.assigned_to || !task.due_date) {
      continue;
    }

    const due = new Date(task.due_date);
    const daysLeft = daysBetween(now, due);
    const overdue = daysLeft < 0;

    if (task.last_reminder_at) {
      const last = new Date(task.last_reminder_at);
      if (daysBetween(last, now) < 1) continue;
    }

    let shouldRemind = false;
    let kind = "";
    let title = "";
    let severity: "info" | "warning" | "critical" = "info";

    if (overdue) {
      shouldRemind = true;
      kind = "overdue";
      title = "Aufgabe überfällig";
      severity = task.priority === "critical" ? "critical" : "warning";
    } else if (REMINDER_DAYS.includes(daysLeft)) {
      shouldRemind = true;
      kind = `due_${daysLeft}`;
      title = daysLeft === 0 ? "Aufgabe heute fällig" : `Aufgabe fällig in ${daysLeft} Tagen`;
      severity = daysLeft <= 3 ? "warning" : "info";
    }

    if (!shouldRemind) continue;

    await createNotification(supabase, {
      companyId,
      userId: task.assigned_to,
      title,
      message: task.title,
      notificationType: overdue ? "task_overdue" : "task_due_soon",
      severity,
      relatedType: "task",
      relatedId: task.id,
      linkPath: `/aufgaben?task=${task.id}`,
    });

    const nextDue = overdue && task.priority === "critical"
      ? new Date(now.getTime() + 86400000).toISOString()
      : null;

    await supabase
      .from("task_items")
      .update({
        last_reminder_at: now.toISOString(),
        next_reminder_at: nextDue,
        status: overdue && task.status !== "waiting_evidence" ? "overdue" : task.status,
        updated_at: now.toISOString(),
      })
      .eq("id", task.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", task.assigned_to)
      .maybeSingle();

    if (profile?.email) {
      await queueEmailNotification(supabase, {
        companyId,
        recipientEmail: profile.email,
        notificationType: overdue ? "task_overdue" : "task_due_soon",
        subject: title,
        body: `${task.title}\n\nÖffnen: /aufgaben?task=${task.id}`,
        relatedType: "task",
        relatedId: task.id,
      });
    }

    sent += 1;
    void reminderKey(task.id, kind);
  }

  return sent;
}
