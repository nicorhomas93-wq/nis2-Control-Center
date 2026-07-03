import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  APPROVED_PUBLISH_STATUSES,
  type LinkedInPublishStatus,
} from "@/lib/jarvis/linkedin-publishing/constants";

export async function logContentAudit(entry: {
  entity_type: "post" | "campaign";
  entity_id: string;
  action: string;
  actor: string;
  campaign_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("jarvis_content_audit_log").insert({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    actor: entry.actor,
    campaign_id: entry.campaign_id ?? null,
    metadata: entry.metadata ?? {},
  });
}

export function canPublishPost(status: string): boolean {
  return (APPROVED_PUBLISH_STATUSES as readonly string[]).includes(status);
}

export function canSchedulePost(status: string): boolean {
  return status === "approved";
}

export function statusAfterApproval(hasFutureSchedule: boolean): LinkedInPublishStatus {
  return hasFutureSchedule ? "scheduled" : "approved";
}

export async function assertCampaignApproved(
  campaignId: string | null | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!campaignId) return { ok: true };

  const supabase = await createClient();
  const { data } = await supabase
    .from("linkedin_campaigns")
    .select("approval_status, name")
    .eq("id", campaignId)
    .maybeSingle();

  if (!data) return { ok: false, error: "Kampagne nicht gefunden" };
  if (data.approval_status !== "approved") {
    return {
      ok: false,
      error: `Kampagne „${data.name}" ist noch nicht freigegeben.`,
    };
  }
  return { ok: true };
}
