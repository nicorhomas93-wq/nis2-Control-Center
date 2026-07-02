import type {
  LinkedInCampaignDemo,
  LinkedInCampaignLead,
} from "@/lib/types";
import {
  REMINDER_TYPE_LABELS,
  type LinkedInReminderType,
} from "@/lib/jarvis/kampagnen/constants";

export interface CampaignReminder {
  id: string;
  type: LinkedInReminderType;
  label: string;
  company_name: string;
  campaign_id: string | null;
  lead_id: string | null;
  due_at: string;
  detail: string;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function computeReminders(
  leads: LinkedInCampaignLead[],
  demos: LinkedInCampaignDemo[]
): CampaignReminder[] {
  const reminders: CampaignReminder[] = [];
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  for (const lead of leads) {
    if (
      lead.status === "contacted" &&
      lead.contacted_at &&
      !["replied", "won", "lost", "demo_scheduled"].includes(lead.status)
    ) {
      const contacted = new Date(lead.contacted_at);
      const daysSince = (Date.now() - contacted.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= 5) {
        reminders.push({
          id: `response-${lead.id}`,
          type: "response_pending",
          label: REMINDER_TYPE_LABELS.response_pending,
          company_name: lead.company_name,
          campaign_id: lead.campaign_id,
          lead_id: lead.id,
          due_at: lead.contacted_at,
          detail: "Kontaktiert, noch keine Antwort dokumentiert",
        });
      }
    }

    if (lead.follow_up_at) {
      const due = new Date(lead.follow_up_at);
      if (due <= todayEnd) {
        reminders.push({
          id: `followup-${lead.id}`,
          type: "follow_up_7d",
          label: REMINDER_TYPE_LABELS.follow_up_7d,
          company_name: lead.company_name,
          campaign_id: lead.campaign_id,
          lead_id: lead.id,
          due_at: lead.follow_up_at,
          detail: lead.next_step || "Follow-Up fällig",
        });
      }
    }

    if (lead.status === "quote_requested") {
      reminders.push({
        id: `offer-${lead.id}`,
        type: "offer_open",
        label: REMINDER_TYPE_LABELS.offer_open,
        company_name: lead.company_name,
        campaign_id: lead.campaign_id,
        lead_id: lead.id,
        due_at: lead.updated_at,
        detail: "Angebot offen",
      });
    }

    if (lead.reminder_type === "pilot_running") {
      reminders.push({
        id: `pilot-${lead.id}`,
        type: "pilot_running",
        label: REMINDER_TYPE_LABELS.pilot_running,
        company_name: lead.company_name,
        campaign_id: lead.campaign_id,
        lead_id: lead.id,
        due_at: lead.follow_up_at ?? lead.updated_at,
        detail: "Pilotphase läuft",
      });
    }
  }

  for (const demo of demos) {
    if (demo.status === "planned" && demo.scheduled_at) {
      const scheduled = new Date(demo.scheduled_at);
      if (scheduled >= todayStart && scheduled <= todayEnd) {
        reminders.push({
          id: `demo-${demo.id}`,
          type: "demo_open",
          label: REMINDER_TYPE_LABELS.demo_open,
          company_name: demo.company_name,
          campaign_id: demo.campaign_id,
          lead_id: demo.lead_id,
          due_at: demo.scheduled_at,
          detail: demo.contact_name
            ? `Demo mit ${demo.contact_name}`
            : "Demo heute geplant",
        });
      }
    }
  }

  return reminders.sort(
    (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
  );
}

export function getTodayReminders(reminders: CampaignReminder[]): CampaignReminder[] {
  const todayEnd = endOfToday();
  return reminders.filter((r) => new Date(r.due_at) <= todayEnd);
}
