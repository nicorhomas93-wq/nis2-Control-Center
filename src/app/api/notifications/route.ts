import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  countUnreadNotifications,
  loadUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/service";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    loadUserNotifications(supabase, user.id),
    countUnreadNotifications(supabase, user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { notificationId, markAll } = body;

  if (markAll) {
    await markAllNotificationsRead(supabase, user.id);
    return NextResponse.json({ ok: true });
  }

  if (!notificationId) {
    return NextResponse.json({ error: "notificationId fehlt" }, { status: 400 });
  }

  await markNotificationRead(supabase, notificationId, user.id);
  return NextResponse.json({ ok: true });
}
