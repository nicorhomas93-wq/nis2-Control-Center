import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationSeverity = "info" | "warning" | "critical";

export interface CreateNotificationInput {
  companyId: string;
  userId: string;
  title: string;
  message: string;
  notificationType: string;
  severity?: NotificationSeverity;
  relatedType?: string;
  relatedId?: string;
  linkPath?: string;
}

export interface NotificationRow {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  severity: NotificationSeverity;
  related_type: string | null;
  related_id: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
}

export async function createNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput
): Promise<NotificationRow | null> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      company_id: input.companyId,
      user_id: input.userId,
      title: input.title,
      message: input.message,
      notification_type: input.notificationType,
      severity: input.severity ?? "info",
      related_type: input.relatedType ?? null,
      related_id: input.relatedId ?? null,
      link_path: input.linkPath ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("createNotification:", error);
    return null;
  }
  return data as NotificationRow;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

export async function loadUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<NotificationRow[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as NotificationRow[];
}

export async function countUnreadNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return count ?? 0;
}
