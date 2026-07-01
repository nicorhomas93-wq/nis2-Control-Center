import { createAdminClient } from "@/lib/supabase/admin";

export type EmailNotificationType =
  | "invitation"
  | "task_assigned"
  | "task_due_soon"
  | "task_overdue"
  | "evidence_missing"
  | "incident_critical"
  | "audit_readiness_dropped";

export interface QueueEmailInput {
  companyId?: string;
  recipientEmail: string;
  notificationType: EmailNotificationType;
  subject: string;
  body: string;
  relatedType?: string;
  relatedId?: string;
  scheduledAt?: string;
  initialStatus?: "pending" | "sent" | "failed";
  sentAt?: string;
  errorMessage?: string;
}

export const EMAIL_TEMPLATES: Record<
  EmailNotificationType,
  { subject: (ctx: Record<string, string>) => string; body: (ctx: Record<string, string>) => string }
> = {
  invitation: {
    subject: (ctx) => `Einladung: ${ctx.productName ?? "NIS2 Control Center"}`,
    body: (ctx) =>
      `Sie wurden eingeladen.\n\nLink: ${ctx.inviteLink}\n\nRolle: ${ctx.role ?? "—"}`,
  },
  task_assigned: {
    subject: (ctx) => `Neue Aufgabe: ${ctx.taskTitle ?? "Aufgabe"}`,
    body: (ctx) => `Ihnen wurde eine Aufgabe zugewiesen:\n\n${ctx.taskTitle}\n\n${ctx.link ?? ""}`,
  },
  task_due_soon: {
    subject: (ctx) => `Erinnerung: ${ctx.taskTitle ?? "Aufgabe"} bald fällig`,
    body: (ctx) => `Die Aufgabe „${ctx.taskTitle}" ist bald fällig.\n\n${ctx.link ?? ""}`,
  },
  task_overdue: {
    subject: (ctx) => `Überfällig: ${ctx.taskTitle ?? "Aufgabe"}`,
    body: (ctx) => `Die Aufgabe „${ctx.taskTitle}" ist überfällig.\n\n${ctx.link ?? ""}`,
  },
  evidence_missing: {
    subject: () => "Nachweis erforderlich",
    body: (ctx) => `Für „${ctx.taskTitle}" fehlt noch ein Nachweis.\n\n${ctx.link ?? ""}`,
  },
  incident_critical: {
    subject: (ctx) => `Kritischer Vorfall: ${ctx.incidentTitle ?? ""}`,
    body: (ctx) => `Ein Sicherheitsvorfall erfordert Aufmerksamkeit:\n\n${ctx.incidentTitle}`,
  },
  audit_readiness_dropped: {
    subject: () => "Audit-Bereitschaft gesunken",
    body: (ctx) => `Ihre Audit-Bereitschaft ist auf ${ctx.percent ?? "—"}% gesunken.\n\n${ctx.reason ?? ""}`,
  },
};

export async function queueEmailNotification(
  input: QueueEmailInput
): Promise<{ queued: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return { queued: false, error: "E-Mail-Warteschlange nicht verfügbar" };
  }

  const { error } = await admin.from("email_notifications").insert({
    company_id: input.companyId ?? null,
    recipient_email: input.recipientEmail,
    subject: input.subject,
    body: input.body,
    notification_type: input.notificationType,
    related_type: input.relatedType ?? null,
    related_id: input.relatedId ?? null,
    status: input.initialStatus ?? "pending",
    scheduled_at: input.scheduledAt ?? new Date().toISOString(),
    sent_at: input.sentAt ?? null,
    error_message: input.errorMessage ?? null,
  });

  if (error) {
    return { queued: false, error: error.message };
  }

  return { queued: true };
}
