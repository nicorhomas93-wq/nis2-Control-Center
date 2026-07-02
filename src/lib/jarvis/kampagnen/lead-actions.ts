import type { LinkedInCampaignLeadStatus } from "@/lib/jarvis/kampagnen/constants";

export function followUpInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function statusUpdateFields(
  status: LinkedInCampaignLeadStatus
): Record<string, unknown> {
  const now = new Date().toISOString();

  switch (status) {
    case "contacted":
      return {
        status,
        contacted_at: now,
        follow_up_at: followUpInDays(7),
        reminder_type: null,
        next_step: "Auf Antwort warten — Follow-Up in 7 Tagen",
      };
    case "replied":
      return {
        status,
        next_step: "Antwort auswerten und nächsten Schritt planen",
      };
    case "demo_scheduled":
      return {
        status,
        next_step: "Demo vorbereiten",
      };
    case "demo_done":
      return {
        status,
        next_step: "Demo-Nachbereitung / Angebot",
      };
    case "quote_requested":
      return {
        status,
        reminder_type: "offer_open",
        next_step: "Angebot erstellen und senden",
      };
    case "won":
      return { status, next_step: "Onboarding Partner" };
    case "lost":
      return { status, next_step: null };
    case "follow_up_later":
      return {
        status,
        follow_up_at: followUpInDays(30),
        next_step: "Erneut ansprechen",
      };
    default:
      return { status };
  }
}
