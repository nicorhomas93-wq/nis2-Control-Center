import "server-only";
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FunnelCheckResult } from "@/lib/funnel/types";
import type { FollowUpTrigger, LifecycleStatus, SequenceId } from "@/lib/acquisition/follow-up/triggers";
import {
  applyPersonalization,
  buildPersonalizationVars,
} from "@/lib/acquisition/follow-up/personalization";
import {
  getEmailTemplate,
  getStandardNurtureTemplates,
  scheduleDayOffset,
  type NurtureEmailKey,
} from "@/lib/acquisition/follow-up/sequences";
import { createAdminClient } from "@/lib/supabase/admin";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nis2-control-center.vercel.app";

function trackToken(): string {
  return randomBytes(16).toString("hex");
}

function trackedUrl(token: string, path: string): string {
  const to = encodeURIComponent(path.startsWith("http") ? path : `${APP_URL}${path}`);
  return `${APP_URL}/api/acquisition/follow-up/click?t=${token}&to=${to}`;
}

export async function getLeadByVisitorId(
  admin: SupabaseClient,
  visitorId: string
): Promise<Record<string, unknown> | null> {
  const { data } = await admin
    .from("acquisition_leads")
    .select("*")
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function updateLeadLifecycle(
  admin: SupabaseClient,
  leadId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await admin.from("acquisition_leads").update(fields).eq("id", leadId);
}

export async function cancelPendingEmails(
  admin: SupabaseClient,
  leadId: string,
  sequenceId?: SequenceId
): Promise<void> {
  let query = admin
    .from("acquisition_email_queue")
    .update({ status: "paused" })
    .eq("acquisition_lead_id", leadId)
    .eq("status", "pending");

  if (sequenceId) {
    query = query.eq("sequence_id", sequenceId);
  }

  await query;
}

export async function queueFollowUpEmail(
  admin: SupabaseClient,
  leadId: string,
  sequenceId: SequenceId,
  emailKey: NurtureEmailKey,
  funnelResult: FunnelCheckResult,
  options: {
    email?: string;
    companyName?: string;
    scheduledAt?: Date;
    immediate?: boolean;
  } = {}
): Promise<void> {
  const template = getEmailTemplate(sequenceId, emailKey);
  if (!template) return;

  const { data: existing } = await admin
    .from("acquisition_email_queue")
    .select("id")
    .eq("acquisition_lead_id", leadId)
    .eq("email_key", emailKey)
    .maybeSingle();

  if (existing) return;

  const token = trackToken();
  const track = (path: string) => trackedUrl(token, path);
  const vars = buildPersonalizationVars(funnelResult, {
    email: options.email,
    companyName: options.companyName,
    trackUrl: track,
  });

  const scheduledAt =
    options.scheduledAt ??
    (options.immediate ? new Date() : scheduleDayOffset(template.day));

  await admin.from("acquisition_email_queue").insert({
    acquisition_lead_id: leadId,
    sequence_id: sequenceId,
    email_key: emailKey,
    sequence_day: template.day,
    subject: applyPersonalization(template.subject, vars),
    body: applyPersonalization(template.body, vars),
    scheduled_at: scheduledAt.toISOString(),
    track_token: token,
    status: "pending",
  });
}

export async function scheduleStandardNurtureSequence(
  admin: SupabaseClient,
  leadId: string,
  funnelResult: FunnelCheckResult,
  email?: string,
  companyName?: string
): Promise<void> {
  for (const template of getStandardNurtureTemplates()) {
    await queueFollowUpEmail(admin, leadId, "standard_nurture", template.key, funnelResult, {
      email,
      companyName,
      scheduledAt: scheduleDayOffset(template.day),
    });
  }

  await updateLeadLifecycle(admin, leadId, {
    lifecycle_status: "nurturing" as LifecycleStatus,
    sequence_id: "standard_nurture",
    status: "nurturing",
    last_trigger: "C",
    next_email_at: scheduleDayOffset(0).toISOString(),
  });
}

export async function fireTrigger(
  trigger: FollowUpTrigger,
  visitorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const lead = await getLeadByVisitorId(admin, visitorId);
  if (!lead?.id) return;

  if (lead.converted_at || lead.lifecycle_status === "converted") return;

  const funnelResult = lead.funnel_result as FunnelCheckResult | null;
  if (!funnelResult) return;

  const leadId = lead.id as string;
  const email = (lead.email as string | null) ?? undefined;

  switch (trigger) {
    case "A":
      await updateLeadLifecycle(admin, leadId, {
        lifecycle_status: email ? "nurturing" : "check_complete",
        last_trigger: "A",
      });
      if (email) {
        await scheduleStandardNurtureSequence(admin, leadId, funnelResult, email);
      }
      break;

    case "B":
      await updateLeadLifecycle(admin, leadId, { last_trigger: "B" });
      if (email) {
        const { data: pending } = await admin
          .from("acquisition_email_queue")
          .select("id")
          .eq("acquisition_lead_id", leadId)
          .eq("status", "pending")
          .limit(1);
        if (!pending?.length) {
          await scheduleStandardNurtureSequence(admin, leadId, funnelResult, email);
        }
      } else {
        await updateLeadLifecycle(admin, leadId, {
          lifecycle_status: "awaiting_email",
        });
      }
      break;

    case "C":
      if (email) {
        await scheduleStandardNurtureSequence(admin, leadId, funnelResult, email);
      }
      break;

    case "D":
      await updateLeadLifecycle(admin, leadId, {
        strong_cta: true,
        strong_offer_eligible: true,
        last_trigger: "D",
      });
      break;
  }

  await logJarvisEvent(admin, {
    event_type: "follow_up_trigger",
    entity_type: "acquisition_lead",
    entity_id: leadId,
    summary: `Follow-up Trigger ${trigger}`,
    details: { visitorId, ...metadata },
  });
}

export async function handleUpgradePageLeave(visitorId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const lead = await getLeadByVisitorId(admin, visitorId);
  if (!lead?.id || lead.converted_at) return;

  const email = lead.email as string | null;
  if (!email) return;

  const funnelResult = lead.funnel_result as FunnelCheckResult;
  await cancelPendingEmails(admin, lead.id as string, "standard_nurture");

  await queueFollowUpEmail(
    admin,
    lead.id as string,
    "high_intent",
    "high_intent_abandon",
    funnelResult,
    { email, immediate: true }
  );

  await updateLeadLifecycle(admin, lead.id as string, {
    lifecycle_status: "high_intent",
    sequence_id: "high_intent",
    high_intent_at: new Date().toISOString(),
    last_trigger: "upgrade_abandon",
  });
}

export async function handleEmailLinkClick(token: string): Promise<{
  redirectUrl: string;
  leadId: string | null;
}> {
  const admin = createAdminClient();
  if (!admin) return { redirectUrl: APP_URL, leadId: null };

  const { data: item } = await admin
    .from("acquisition_email_queue")
    .select("*, acquisition_leads(*)")
    .eq("track_token", token)
    .maybeSingle();

  if (!item) return { redirectUrl: APP_URL, leadId: null };

  const lead = item.acquisition_leads as Record<string, unknown> | null;
  const leadId = lead?.id as string | undefined;
  const funnelResult = lead?.funnel_result as FunnelCheckResult | undefined;

  if (leadId && funnelResult && !lead?.converted_at) {
    await cancelPendingEmails(admin, leadId, "standard_nurture");
    await updateLeadLifecycle(admin, leadId, {
      lifecycle_status: "high_intent",
      sequence_id: "high_intent",
      high_intent_at: new Date().toISOString(),
      email_link_clicked_at: new Date().toISOString(),
      strong_cta: true,
    });

    await logJarvisEvent(admin, {
      event_type: "follow_up_email_click",
      entity_type: "acquisition_lead",
      entity_id: leadId,
      summary: "E-Mail-Link geklickt → High-Intent",
      details: { email_key: item.email_key },
    });
  }

  return {
    redirectUrl: APP_URL + "/upgrade",
    leadId: leadId ?? null,
  };
}

export async function markLeadConverted(visitorId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const lead = await getLeadByVisitorId(admin, visitorId);
  if (!lead?.id) return;

  await cancelPendingEmails(admin, lead.id as string);
  await updateLeadLifecycle(admin, lead.id as string, {
    lifecycle_status: "converted",
    status: "converted",
    converted_at: new Date().toISOString(),
  });
}

export function shouldShowStrongCta(lead: Record<string, unknown> | null): boolean {
  if (!lead) return false;
  return Boolean(lead.strong_cta || lead.strong_offer_eligible);
}
