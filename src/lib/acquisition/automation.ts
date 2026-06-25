import "server-only";
import type { AcquisitionEventType, UtmParams } from "@/lib/acquisition/types";
import { calculateAcquisitionScore } from "@/lib/acquisition/lead-scoring";
import {
  fireTrigger,
  handleUpgradePageLeave,
  markLeadConverted,
  scheduleStandardNurtureSequence,
} from "@/lib/acquisition/follow-up/engine";
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
  const upgraded = eventList.some((e) => e.event_type === "upgrade_click" || e.event_type === "converted");

  const scoreResult = calculateAcquisitionScore({
    checkCompleted,
    visitCount,
    ctaClicks,
    emailCaptured,
  });

  await admin
    .from("acquisition_visitors")
    .update({
      lead_score: scoreResult.score,
      last_seen_at: new Date().toISOString(),
    })
    .eq("visitor_id", options.visitorId);

  if (options.eventType === "converted") {
    await markLeadConverted(options.visitorId);
    return;
  }

  if (options.eventType === "upgrade_click") {
    return;
  }

  if (options.eventType === "result_page_leave" && !upgraded) {
    await fireTrigger("B", options.visitorId, { pagePath: options.pagePath });
  }

  if (options.eventType === "upgrade_page_leave" && !upgraded) {
    await handleUpgradePageLeave(options.visitorId);
  }

  if (
    options.eventType === "page_view" &&
    checkCompleted &&
    visitCount >= 2 &&
    !upgraded &&
    !eventList.some((e) => e.event_type === "site_return")
  ) {
    await admin.from("acquisition_events").insert({
      visitor_id: options.visitorId,
      event_type: "site_return",
      page_path: options.pagePath ?? null,
      metadata: { visitCount },
    });
    await fireTrigger("D", options.visitorId, { visitCount });
  }

  const shouldRetarget =
    options.eventType === "page_leave" &&
    RETARGETING_PATHS.some((p) => options.pagePath?.startsWith(p)) &&
    scoreResult.score >= RETARGETING_MIN_SCORE &&
    !checkCompleted;

  if (shouldRetarget) {
    await admin
      .from("acquisition_visitors")
      .update({ retargeting_eligible: true })
      .eq("visitor_id", options.visitorId);

    await admin.from("acquisition_events").insert({
      visitor_id: options.visitorId,
      event_type: "retargeting_triggered",
      page_path: options.pagePath ?? null,
      metadata: { score: scoreResult.score },
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
      lifecycle_status: options.email ? "nurturing" : "check_complete",
      sequence_id: "standard_nurture",
      strong_offer_eligible: scoreResult.strongOfferEligible,
      strong_cta: scoreResult.strongOfferEligible,
      email_sequence_step: 0,
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

  await fireTrigger("A", options.visitorId);

  if (options.email) {
    await scheduleStandardNurtureSequence(
      admin,
      lead.id,
      options.funnelResult,
      options.email
    );
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

  await admin.from("acquisition_leads").update({ email }).eq("id", leadId);

  const funnelResult = lead.funnel_result as FunnelCheckResult | null;
  if (funnelResult) {
    await fireTrigger("C", visitorId);
    await scheduleStandardNurtureSequence(admin, leadId, funnelResult, email);
  }

  await syncAcquisitionLeadToJarvis(admin, leadId);
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
    .select("*, acquisition_leads(email, lifecycle_status, converted_at)")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .limit(20);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of pending ?? []) {
    const leadRow = item.acquisition_leads as {
      email: string | null;
      lifecycle_status?: string;
      converted_at?: string | null;
    } | null;

    if (leadRow?.converted_at || leadRow?.lifecycle_status === "converted") {
      await admin
        .from("acquisition_email_queue")
        .update({ status: "paused" })
        .eq("id", item.id);
      skipped++;
      continue;
    }

    const leadEmail = leadRow?.email;
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

      await admin
        .from("acquisition_leads")
        .update({
          email_sequence_step: item.sequence_day ?? 0,
        })
        .eq("id", item.acquisition_lead_id);

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
