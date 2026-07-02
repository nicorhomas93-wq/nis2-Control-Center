import { createClient } from "@/lib/supabase/server";
import type {
  LinkedInCampaign,
  LinkedInCampaignDemo,
  LinkedInCampaignLead,
  LinkedInCampaignResponse,
  LinkedInCampaignTask,
} from "@/lib/types";

export interface KampagnenPageData {
  campaigns: LinkedInCampaign[];
  leads: LinkedInCampaignLead[];
  responses: LinkedInCampaignResponse[];
  demos: LinkedInCampaignDemo[];
  tasks: LinkedInCampaignTask[];
  error: string | null;
  missingTable: boolean;
}

export async function loadKampagnenData(): Promise<KampagnenPageData> {
  const supabase = await createClient();

  const [campaignsRes, leadsRes, responsesRes, demosRes, tasksRes] = await Promise.all([
    supabase.from("linkedin_campaigns").select("*").order("updated_at", { ascending: false }),
    supabase
      .from("linkedin_campaign_leads")
      .select("*, campaign:linkedin_campaigns(id, name, target_group, status)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("linkedin_campaign_responses")
      .select("*")
      .order("response_date", { ascending: false }),
    supabase
      .from("linkedin_campaign_demos")
      .select("*")
      .order("scheduled_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("linkedin_campaign_tasks")
      .select("*")
      .order("due_at", { ascending: true, nullsFirst: false }),
  ]);

  const error =
    campaignsRes.error?.message ??
    leadsRes.error?.message ??
    responsesRes.error?.message ??
    demosRes.error?.message ??
    tasksRes.error?.message ??
    null;

  const missingTable = Boolean(
    campaignsRes.error?.message?.includes("linkedin_campaigns") ||
      campaignsRes.error?.code === "42P01"
  );

  return {
    campaigns: (campaignsRes.data ?? []) as LinkedInCampaign[],
    leads: (leadsRes.data ?? []) as LinkedInCampaignLead[],
    responses: (responsesRes.data ?? []) as LinkedInCampaignResponse[],
    demos: (demosRes.data ?? []) as LinkedInCampaignDemo[],
    tasks: (tasksRes.data ?? []) as LinkedInCampaignTask[],
    error,
    missingTable,
  };
}

export async function loadCampaignDetail(campaignId: string) {
  const supabase = await createClient();

  const [campaignRes, leadsRes, responsesRes, demosRes] = await Promise.all([
    supabase.from("linkedin_campaigns").select("*").eq("id", campaignId).single(),
    supabase
      .from("linkedin_campaign_leads")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("lead_score", { ascending: false, nullsFirst: false }),
    supabase
      .from("linkedin_campaign_responses")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("response_date", { ascending: false }),
    supabase
      .from("linkedin_campaign_demos")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("scheduled_at", { ascending: false, nullsFirst: false }),
  ]);

  return {
    campaign: campaignRes.data as LinkedInCampaign | null,
    leads: (leadsRes.data ?? []) as LinkedInCampaignLead[],
    responses: (responsesRes.data ?? []) as LinkedInCampaignResponse[],
    demos: (demosRes.data ?? []) as LinkedInCampaignDemo[],
    error: campaignRes.error?.message ?? null,
  };
}
