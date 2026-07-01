import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { processTaskReminders } from "@/lib/tasks/reminders";
import { loadCompanyTasks } from "@/lib/tasks/service";
import type { TaskItem } from "@/lib/tasks/types";

export interface ReminderRunResult {
  companiesProcessed: number;
  remindersSent: number;
  errors: string[];
}

export async function runAllTaskReminders(
  supabase?: SupabaseClient | null
): Promise<ReminderRunResult> {
  const client = supabase ?? createAdminClient();
  if (!client) {
    return {
      companiesProcessed: 0,
      remindersSent: 0,
      errors: ["Admin-Client nicht verfügbar (SUPABASE_SERVICE_ROLE_KEY)"],
    };
  }

  const { data: companyRows, error } = await client
    .from("companies")
    .select("id")
    .is("deleted_at", null);

  if (error) {
    return { companiesProcessed: 0, remindersSent: 0, errors: [error.message] };
  }

  const errors: string[] = [];
  let remindersSent = 0;
  let companiesProcessed = 0;

  for (const row of companyRows ?? []) {
    try {
      const tasks = await loadCompanyTasks(client, row.id);
      const openAssigned = tasks.filter((t) => t.assigned_to);
      if (openAssigned.length === 0) continue;

      const activeTasks = await filterTasksForActiveAssignees(client, openAssigned);
      const sent = await processTaskReminders(client, row.id, activeTasks);
      remindersSent += sent;
      companiesProcessed += 1;
    } catch (e) {
      errors.push(`company ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { companiesProcessed, remindersSent, errors };
}

async function filterTasksForActiveAssignees(
  supabase: SupabaseClient,
  tasks: TaskItem[]
): Promise<TaskItem[]> {
  const userIds = [...new Set(tasks.map((t) => t.assigned_to).filter(Boolean))] as string[];
  if (userIds.length === 0) return tasks;

  const { data: members } = await supabase
    .from("company_members")
    .select("user_id, active")
    .in("user_id", userIds);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, status")
    .in("id", userIds);

  const inactiveUsers = new Set<string>();
  for (const m of members ?? []) {
    if (!m.active) inactiveUsers.add(m.user_id);
  }
  for (const p of profiles ?? []) {
    if (p.status === "deactivated") inactiveUsers.add(p.id);
  }

  return tasks.filter((t) => !t.assigned_to || !inactiveUsers.has(t.assigned_to));
}
