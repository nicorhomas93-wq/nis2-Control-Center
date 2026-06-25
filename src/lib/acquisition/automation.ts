import "server-only";
import type { AcquisitionEventType, UtmParams } from "@/lib/acquisition/types";
import { calculateAcquisitionScore } from "@/lib/acquisition/lead-scoring";
import {
  EMAIL_SEQUENCE_DAYS,
  renderSequenceEmail,
  scheduleEmailAt,
} from "@/lib/acquisition/email-sequences";
import { syncAcquisitionLeadToJarvis } from "@/lib/acquisition/sync-to-jarvis";
import { createAdminClient } from "@/lib/supabase/admin";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";
import type { FunnelCheckResult } from "@/lib/funnel/types";

const RETARGETING_MIN_SCORE = 10;
const RETARGETING_PATHS = ["/check", "/result", "/upgrade", "/"];

export async function upsertVisitor(
  visitorId: string,
  utm?: UtmParams
): Promise<{ visitCount: number; leadScore: number }> {
  const admin = createAdminClient();
  if (!admin) return { visitCount: 1, leadScore: 0 };

  const { data: existing } = await admin
    .from("acquisition_visitors")
    .select("*")
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (existing) {
    const visitCount = existing.visit_count + 1;
    await admin
      .from("acquisition_visitors")
      .update({
        visit_count: visitCount,
        last_seen_at: new Date().toISOString(),
        ...(utm?.utm_source ? { utm_source: utm.utm_source } : {}),
        ...(utm?.utm_medium ? { utm_medium: utm.utm_medium } : {}),
        ...(utm?.utm_campaign ? { utm_campaign: utm.utm_campaign } : {}),
      })
      .eq("visitor_id", visitorId);

    return { visitCount, leadScore: existing.lead_score };
  }

  await admin.from("acquisition_visitors").insert({
    visitor_id: visitorId,
    visit_count: 1,
    utm_source: utm?.utm_source ?? null,
    utm_medium: utm?.utm_medium ?? null,
    utm_campaign: utm?.utm_campaign ?? null,
    utm_content: utm?.utm_content ?? null,
  });

  return { visitCount: 1, leadScore: 0 };
}

export async function trackAcquisitionEvent(options: {
  visitorId: string;
  eventType: AcquisitionEventType;
  pagePath?: string;
  metadata?: Record<string, unknown>;
  utm?: UtmParams;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const { visitCount } = await upsertVisitor(options.visitorId, options.utm);

  await admin.from("acquisition_events").insert({
    visitor_id: options.visitorId,
    event_type: options.eventType,
    page_path: options.pagePath ?? null,
    metadata: options.metadata ?? {},
  });

  const { data: events } = await admin
    .from("acquisition_events")
    .select("event_type")
    .eq("visitor_id", options.visitorId);

  const eventList = events ?? [];
  const checkCompleted = eventList.some((e) => e.event_type === "check_completed");
  const ctaClicks = eventList.filter((e) => e.event_type === "cta_click").length;
  const emailCaptured = eventList.some((e) => e.event_type === "email_captured");

  const scoreResult = calculateAcquisitionScore({
    checkCompleted,
    visitCount,
    ctaClicks,
    emailCaptured,
  });

  const shouldRetarget =
    options.eventType === "page_leave" &&
    RETARGETING_PATHS.some((p) => options.pagePath?.startsWith(p)) &&
    scoreResult.score >= RETARGETING_MIN_SCORE &&
    !checkCompleted;

  await admin
    .from("acquisition_visitors")
    .update({
      lead_score: scoreResult.score,
      retargeting_eligible: shouldRetarget || undefined,
      last_seen_at: new Date().toISOString(),
    })
    .eq("visitor_id", options.visitorId);

  if (shouldRetarget) {
    await admin.from("acquisition_events").insert({
      visitor_id: options.visitorId,
      event_type: "retargeting_triggered",
      page_path: options.pagePath ?? null,
      metadata: { score: scoreResult.score },
    });

    await logJarvisEvent(admin, {
      event_type: "acquisition_retargeting",
      entity_type: "visitor",
      summary: `Retargeting ausgelöst: ${options.visitorId}`,
      details: { pagePath: options.pagePath, score: scoreResult.score },
    });
  }
}

export async function processCheckCompleted(options: {
  visitorId: string;
  funnelResult: FunnelCheckResult;
  email?: string;
  utm?: UtmParams;
}): Promise<{ leadId: string | null; score: number; strongOffer: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { leadId: null, score: 0, strongOffer: false };

  await trackAcquisitionEvent({
    visitorId: options.visitorId,
    eventType: "check_completed",
    pagePath: "/check",
    metadata: { funnelScore: options.funnelResult.score, level: options.funnelResult.level },
    utm: options.utm,
  });

  const { data: visitor } = await admin
    .from("acquisition_visitors")
    .select("visit_count")
    .eq("visitor_id", options.visitorId)
    .maybeSingle();

  const { data: events } = await admin
    .from("acquisition_events")
    .select("event_type")
    .eq("visitor_id", options.visitorId);

  const eventList = events ?? [];
  const scoreResult = calculateAcquisitionScore({
    checkCompleted: true,
    visitCount: visitor?.visit_count ?? 1,
    ctaClicks: eventList.filter((e) => e.event_type === "cta_click").length,
    emailCaptured: Boolean(options.email),
    funnelScore: options.funnelResult.score,
  });

  const industryMap: Record<string, string> = {
    produktion: "Produktion",
    handel: "Handel",
    dienstleistung: "Dienstleistung",
    gesundheit: "Gesundheit",
    energie: "Energie",
    it: "IT",
    sonstige: "Sonstige",
  };

  const sizeMap: Record<string, string> = {
    "1-49": "1–49 MA",
    "50-249": "50–249 MA",
    "250+": "250+ MA",
  };

  const { data: lead, error } = await admin
    .from("acquisition_leads")
    .insert({
      visitor_id: options.visitorId,
      email: options.email ?? null,
      industry: industryMap[options.funnelResult.answers.industry] ?? null,
      company_size: sizeMap[options.funnelResult.answers.companySize] ?? null,
      funnel_result: options.funnelResult as unknown as Record<string, unknown>,
      acquisition_score: scoreResult.score,
      funnel_score: options.funnelResult.score,
      source: "nis2_check",
      utm_source: options.utm?.utm_source ?? null,
      utm_medium: options.utm?.utm_medium ?? null,
      utm_campaign: options.utm?.utm_campaign ?? null,
      status: options.email ? "nurturing" : "new",
      strong_offer_eligible: scoreResult.strongOfferEligible,
      email_sequence_step: 0,
      next_email_at: options.email
        ? scheduleEmailAt(new Date(), 0).toISOString()
        : null,
    })
    .select()
    .single();

  if (error || !lead) {
    console.error("[Acquisition] Lead insert failed:", error?.message);
    return { leadId: null, score: scoreResult.score, strongOffer: scoreResult.strongOfferEligible };
  }

  await admin
    .from("acquisition_visitors")
    .update({ lead_score: scoreResult.score })
    .eq("visitor_id", options.visitorId);

  if (options.email) {
    await scheduleNurtureSequence(lead.id, options.email, options.funnelResult);
    await syncAcquisitionLeadToJarvis(admin, lead.id);
  }

  await logJarvisEvent(admin, {
    event_type: "acquisition_check_completed",
    entity_type: "acquisition_lead",
    entity_id: lead.id,
    summary: `NIS2-Check abgeschlossen (Score ${scoreResult.score})`,
    details: {
      funnelScore: options.funnelResult.score,
      strongOffer: scoreResult.strongOfferEligible,
      email: options.email ?? null,
    },
  });

  return {
    leadId: lead.id,
    score: scoreResult.score,
    strongOffer: scoreResult.strongOfferEligible,
  };
}

export async function captureLeadEmail(
  visitorId: string,
  email: string,
  acquisitionLeadId?: string
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await trackAcquisitionEvent({
    visitorId,
    eventType: "email_captured",
    pagePath: "/result",
    metadata: { email },
  });

  let leadId = acquisitionLeadId;
  if (!leadId) {
    const { data } = await admin
      .from("acquisition_leads")
      .select("id, funnel_result")
      .eq("visitor_id", visitorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    leadId = data?.id;
  }

  if (!leadId) return;

  const { data: lead } = await admin
    .from("acquisition_leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) return;

  await admin
    .from("acquisition_leads")
    .update({
      email,
      status: "nurturing",
      next_email_at: scheduleEmailAt(new Date(), 0).toISOString(),
    })
    .eq("id", leadId);

  const funnelResult = lead.funnel_result as FunnelCheckResult | null;
  if (funnelResult) {
    await scheduleNurtureSequence(leadId, email, funnelResult);
  }

  await syncAcquisitionLeadToJarvis(admin, leadId);
}

async function scheduleNurtureSequence(
  acquisitionLeadId: string,
  email: string,
  funnelResult: FunnelCheckResult
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const vars = {
    result_summary: funnelResult.problemFrame,
    offer_line: funnelResult.score >= 60
      ? "Aufgrund Ihres Ergebnisses empfehlen wir den Pilot-Start mit 30 Tagen Nutzung."
      : "Starten Sie mit dem passenden Plan für Ihr Unternehmen.",
  };

  const baseDate = new Date();

  for (const day of EMAIL_SEQUENCE_DAYS) {
    const { subject, body } = renderSequenceEmail(day, vars);
    const scheduledAt = scheduleEmailAt(baseDate, day);

    const { data: existing } = await admin
      .from("acquisition_email_queue")
      .select("id")
      .eq("acquisition_lead_id", acquisitionLeadId)
      .eq("sequence_day", day)
      .maybeSingle();

    if (!existing) {
      await admin.from("acquisition_email_queue").insert({
        acquisition_lead_id: acquisitionLeadId,
        sequence_day: day,
        subject,
        body,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
      });
    }
  }

  void email;
}

export async function processEmailQueue(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const admin = createAdminClient();
  if (!admin) return { sent: 0, failed: 0, skipped: 0 };

  const { sendLeadEmail } = await import("@/lib/jarvis/send-lead-email");
  const now = new Date().toISOString();

  const { data: pending } = await admin
    .from("acquisition_email_queue")
    .select("*, acquisition_leads(email)")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .limit(20);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of pending ?? []) {
    const leadEmail = (item.acquisition_leads as { email: string | null } | null)?.email;
    if (!leadEmail) {
      skipped++;
      continue;
    }

    const result = await sendLeadEmail({
      to: leadEmail,
      subject: item.subject,
      body: item.body,
    });

    if (result.sent) {
      await admin
        .from("acquisition_email_queue")
        .update({ status: "sent", sent_at: now })
        .eq("id", item.id);
      sent++;
    } else {
      await admin
        .from("acquisition_email_queue")
        .update({ status: "failed", error_message: result.error ?? "unknown" })
        .eq("id", item.id);
      failed++;
    }
  }

  return { sent, failed, skipped };
}
