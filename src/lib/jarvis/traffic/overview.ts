import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentIdea,
  OutreachDraft,
  TrafficCampaign,
  TrafficTargetGroup,
  TrafficTask,
} from "@/lib/types";

export type TrafficOverviewStats = {
  activeTargetGroups: number;
  activeCampaigns: number;
  openTrafficTasks: number;
  outreachDrafts: number;
  contentIdeas: number;
};

export type TrafficRecommendation = {
  id: string;
  text: string;
  href?: string;
};

export type TrafficOverview = {
  stats: TrafficOverviewStats;
  todayRecommendations: TrafficRecommendation[];
  recentEvents: { summary: string; event_type: string; created_at: string }[];
};

export async function getTrafficOverview(
  supabase: SupabaseClient
): Promise<TrafficOverview> {
  const [
    groupsRes,
    campaignsRes,
    tasksRes,
    outreachRes,
    contentRes,
    eventsRes,
  ] = await Promise.all([
    supabase.from("traffic_target_groups").select("id, active, name, priority"),
    supabase.from("traffic_campaigns").select("id, status, name, weekly_target"),
    supabase.from("traffic_tasks").select("id, status, title, due_date, priority"),
    supabase.from("outreach_drafts").select("id, status, channel, purpose"),
    supabase.from("content_ideas").select("id, status, title, platform"),
    supabase
      .from("jarvis_events")
      .select("summary, event_type, created_at")
      .like("event_type", "traffic_%")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const groups = (groupsRes.data ?? []) as Pick<
    TrafficTargetGroup,
    "id" | "active" | "name" | "priority"
  >[];
  const campaigns = (campaignsRes.data ?? []) as Pick<
    TrafficCampaign,
    "id" | "status" | "name" | "weekly_target"
  >[];
  const tasks = (tasksRes.data ?? []) as Pick<
    TrafficTask,
    "id" | "status" | "title" | "due_date" | "priority"
  >[];
  const outreach = (outreachRes.data ?? []) as Pick<
    OutreachDraft,
    "id" | "status" | "channel" | "purpose"
  >[];
  const content = (contentRes.data ?? []) as Pick<
    ContentIdea,
    "id" | "status" | "title" | "platform"
  >[];

  const stats: TrafficOverviewStats = {
    activeTargetGroups: groups.filter((g) => g.active).length,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    openTrafficTasks: tasks.filter((t) => t.status === "open").length,
    outreachDrafts: outreach.filter((o) => o.status === "draft").length,
    contentIdeas: content.filter((c) => c.status === "idea").length,
  };

  const todayRecommendations = buildTodayRecommendations(
    groups,
    campaigns,
    tasks,
    outreach,
    content
  );

  return {
    stats,
    todayRecommendations,
    recentEvents: eventsRes.data ?? [],
  };
}

function buildTodayRecommendations(
  groups: Pick<TrafficTargetGroup, "id" | "active" | "name" | "priority">[],
  campaigns: Pick<TrafficCampaign, "id" | "status" | "name" | "weekly_target">[],
  tasks: Pick<TrafficTask, "id" | "status" | "title" | "due_date" | "priority">[],
  outreach: Pick<OutreachDraft, "id" | "status" | "channel" | "purpose">[],
  content: Pick<ContentIdea, "id" | "status" | "title" | "platform">[]
): TrafficRecommendation[] {
  const recs: TrafficRecommendation[] = [];
  const activeHigh = groups.filter((g) => g.active && g.priority === "high");

  if (activeHigh.length > 0) {
    const top = activeHigh[0];
    recs.push({
      id: "research-today",
      text: `Heute 10 „${top.name}" recherchieren (manuell, z. B. LinkedIn/Google).`,
      href: "/jarvis/traffic/search-profiles",
    });
  }

  const mspGroup = groups.find((g) => g.name.includes("MSP") && g.active);
  if (mspGroup) {
    recs.push({
      id: "linkedin-msp",
      text: `Für Zielgruppe „${mspGroup.name}" einen LinkedIn-Erstkontakt-Text vorbereiten (manuell senden).`,
      href: "/jarvis/traffic/outreach",
    });
  }

  const pilotDrafts = outreach.filter(
    (o) => o.purpose === "pilot_offer" && o.status === "draft"
  );
  if (pilotDrafts.length === 0) {
    recs.push({
      id: "pilot-followup",
      text: "Follow-up-Vorlage für Pilotangebot erstellen.",
      href: "/jarvis/traffic/outreach",
    });
  } else {
    recs.push({
      id: "pilot-draft-review",
      text: `${pilotDrafts.length} Pilotangebot-Entwurf/Entwürfe prüfen und freigeben.`,
      href: "/jarvis/traffic/outreach",
    });
  }

  const linkedInContent = content.find(
    (c) => c.platform === "LinkedIn" && c.status === "idea"
  );
  if (linkedInContent) {
    recs.push({
      id: "linkedin-post",
      text: `LinkedIn-Post veröffentlichen: „${linkedInContent.title}"`,
      href: "/jarvis/traffic/content-ideas",
    });
  } else {
    recs.push({
      id: "linkedin-audit-post",
      text: "LinkedIn-Post über NIS2-Audit-Ordner als Content-Idee anlegen.",
      href: "/jarvis/traffic/content-ideas",
    });
  }

  const activeCampaign = campaigns.find((c) => c.status === "active");
  if (activeCampaign) {
    recs.push({
      id: "campaign-weekly",
      text: `Kampagne „${activeCampaign.name}": Wochenziel ${activeCampaign.weekly_target} Kontakte — Wochenplan prüfen.`,
      href: "/jarvis/traffic/weekly-plan",
    });
  }

  const dueTasks = tasks.filter((t) => t.status === "open" && t.priority === "high");
  if (dueTasks.length > 0) {
    recs.push({
      id: "high-tasks",
      text: `${dueTasks.length} priorisierte Traffic-Aufgabe(n) heute erledigen.`,
      href: "/jarvis/traffic/weekly-plan",
    });
  }

  if (groups.filter((g) => g.active).length === 0) {
    recs.unshift({
      id: "seed-groups",
      text: "Zielgruppen anlegen oder Standard-Zielgruppen laden.",
      href: "/jarvis/traffic/target-groups",
    });
  }

  return recs.slice(0, 6);
}
