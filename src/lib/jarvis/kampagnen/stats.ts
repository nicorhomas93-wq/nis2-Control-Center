import type {
  LinkedInCampaign,
  LinkedInCampaignDemo,
  LinkedInCampaignLead,
  LinkedInCampaignResponse,
} from "@/lib/types";
import {
  ACTIVE_CAMPAIGN_STATUSES,
  ENDED_CAMPAIGN_STATUSES,
  LOST_LEAD_STATUSES,
  WON_LEAD_STATUSES,
} from "@/lib/jarvis/kampagnen/constants";

export interface KampagnenDashboardStats {
  activeCampaigns: number;
  totalLeads: number;
  contacted: number;
  responses: number;
  demos: number;
  quotes: number;
  won: number;
  pipelineValue: number;
}

export function computeKampagnenStats(
  campaigns: LinkedInCampaign[],
  leads: LinkedInCampaignLead[],
  responses: LinkedInCampaignResponse[],
  demos: LinkedInCampaignDemo[]
): KampagnenDashboardStats {
  const activeCampaigns = campaigns.filter((c) =>
    ACTIVE_CAMPAIGN_STATUSES.includes(c.status as never)
  ).length;

  const contacted = leads.filter((l) =>
    [
      "contacted",
      "replied",
      "demo_scheduled",
      "demo_done",
      "quote_requested",
      "won",
      "lost",
      "follow_up_later",
    ].includes(l.status)
  ).length;

  const quotes = leads.filter((l) => l.status === "quote_requested").length;
  const won = leads.filter((l) => WON_LEAD_STATUSES.includes(l.status as never)).length;

  const openDemos = demos.filter((d) =>
    ["planned", "completed", "offer_follows", "pilot"].includes(d.status)
  ).length;

  const pipelineValue = campaigns
    .filter((c) => !ENDED_CAMPAIGN_STATUSES.includes(c.status as never))
    .reduce((sum, c) => sum + Number(c.pipeline_value ?? 0), 0);

  return {
    activeCampaigns,
    totalLeads: leads.length,
    contacted,
    responses: responses.length,
    demos: openDemos,
    quotes,
    won,
    pipelineValue,
  };
}

export interface NextStepsSummary {
  openLeads: LinkedInCampaignLead[];
  repliedLeads: LinkedInCampaignLead[];
  demoLeads: LinkedInCampaignLead[];
  pricingLeads: LinkedInCampaignLead[];
  followUpLeads: LinkedInCampaignLead[];
  lostLeads: LinkedInCampaignLead[];
}

export function summarizeNextSteps(leads: LinkedInCampaignLead[]): NextStepsSummary {
  return {
    openLeads: leads.filter((l) => ["new", "researched", "message_prepared"].includes(l.status)),
    repliedLeads: leads.filter((l) => l.status === "replied"),
    demoLeads: leads.filter((l) =>
      ["demo_scheduled", "demo_done"].includes(l.status)
    ),
    pricingLeads: leads.filter((l) => l.status === "quote_requested"),
    followUpLeads: leads.filter((l) => l.status === "follow_up_later"),
    lostLeads: leads.filter((l) => LOST_LEAD_STATUSES.includes(l.status as never)),
  };
}
