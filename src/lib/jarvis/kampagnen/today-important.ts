import type {
  LinkedInCampaignLead,
  LinkedInCampaignResponse,
  LinkedInCampaignTask,
} from "@/lib/types";

export interface TodayImportantStats {
  responsesToReview: number;
  demosToPlan: number;
  followUpsDue: number;
  offersOpen: number;
  managementReview: number;
  followUpLater: number;
  openTasks: number;
  items: Array<{ label: string; count: number; detail: string }>;
}

export function computeTodayImportant(
  leads: LinkedInCampaignLead[],
  responses: LinkedInCampaignResponse[],
  tasks: LinkedInCampaignTask[]
): TodayImportantStats {
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const openTasks = tasks.filter((t) => t.status === "open");
  const followUpsDue = openTasks.filter(
    (t) => t.due_at && new Date(t.due_at) <= todayEnd
  ).length;

  const demosToPlan = leads.filter((l) =>
    ["demo_scheduled", "replied"].includes(l.status) &&
    openTasks.some((t) => t.lead_id === l.id && t.task_type === "demo_schedule")
  ).length;

  const offersOpen = leads.filter((l) => l.status === "quote_requested").length;
  const managementReview = leads.filter((l) => l.management_review_at != null).length;
  const followUpLater = leads.filter((l) => l.status === "follow_up_later").length;

  const recentResponses = responses.filter((r) => {
    const created = new Date(r.created_at);
    const days = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 3;
  });

  const responsesToReview = recentResponses.filter(
    (r) => r.suggested_reply && !r.notes?.includes("[gesendet]")
  ).length;

  const items = [
    {
      label: "Antworten prüfen",
      count: responsesToReview,
      detail: "Antwortvorschlag prüfen und manuell senden",
    },
    {
      label: "Demos terminieren",
      count: demosToPlan,
      detail: "Demo-Termine abstimmen",
    },
    {
      label: "Follow-ups fällig",
      count: followUpsDue,
      detail: "Aufgaben mit Fälligkeit heute",
    },
    {
      label: "Angebote offen",
      count: offersOpen,
      detail: "Angebot vorbereiten oder nachfassen",
    },
    {
      label: "Geschäftsführung prüft",
      count: managementReview,
      detail: "Intern in Prüfung — Follow-up planen",
    },
    {
      label: "Später melden",
      count: followUpLater,
      detail: "Wiedervorlagen",
    },
  ].filter((i) => i.count > 0);

  return {
    responsesToReview,
    demosToPlan,
    followUpsDue,
    offersOpen,
    managementReview,
    followUpLater,
    openTasks: openTasks.length,
    items,
  };
}
