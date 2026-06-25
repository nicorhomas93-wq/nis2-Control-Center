import type { SupabaseClient } from "@supabase/supabase-js";
import type { JarvisEvent, Lead } from "@/lib/types";
import { getLeadScoreCategory } from "@/lib/jarvis/lead-scoring";

export type JarvisOverviewStats = {
  newLeads: number;
  hotLeads: number;
  openFollowUps: number;
  sentEmails: number;
  demoScheduled: number;
  wonPilots: number;
  unsyncedPilotRequests: number;
};

export type JarvisRecommendation = {
  id: string;
  text: string;
  action?: string;
  href?: string;
};

export type JarvisOverview = {
  stats: JarvisOverviewStats;
  recentEvents: JarvisEvent[];
  recommendations: JarvisRecommendation[];
};

export async function getJarvisOverview(
  supabase: SupabaseClient
): Promise<JarvisOverview> {
  const [
    leadsRes,
    tasksRes,
    interactionsRes,
    eventsRes,
    pilotRes,
    existingEmailsRes,
  ] = await Promise.all([
    supabase.from("leads").select("*"),
    supabase
      .from("sales_tasks")
      .select("id")
      .eq("status", "open"),
    supabase
      .from("lead_interactions")
      .select("id, type, status"),
    supabase
      .from("jarvis_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("pilot_requests").select("email"),
    supabase.from("leads").select("email").not("email", "is", null),
  ]);

  const leads = (leadsRes.data ?? []) as Lead[];
  const interactions = interactionsRes.data ?? [];

  const existingEmails = new Set(
    (existingEmailsRes.data ?? [])
      .map((l) => l.email?.trim().toLowerCase())
      .filter(Boolean)
  );

  const unsyncedPilotRequests = (pilotRes.data ?? []).filter((p) => {
    const email = p.email?.trim().toLowerCase();
    return email && !existingEmails.has(email);
  }).length;

  const stats: JarvisOverviewStats = {
    newLeads: leads.filter((l) => l.status === "new").length,
    hotLeads: leads.filter((l) => getLeadScoreCategory(l.lead_score) === "hot")
      .length,
    openFollowUps:
      (tasksRes.data?.length ?? 0) +
      interactions.filter(
        (i) =>
          (i.type === "follow_up" || i.type === "email") &&
          (i.status === "scheduled" || i.status === "draft")
      ).length,
    sentEmails: interactions.filter(
      (i) => i.type === "email" && i.status === "sent"
    ).length,
    demoScheduled: leads.filter((l) => l.status === "demo_scheduled").length,
    wonPilots: leads.filter((l) => l.status === "won").length,
    unsyncedPilotRequests,
  };

  const recommendations: JarvisRecommendation[] = [];

  if (stats.unsyncedPilotRequests > 0) {
    recommendations.push({
      id: "sync-pilots",
      text: `${stats.unsyncedPilotRequests} neue Pilotanfrage(n) synchronisieren`,
      action: "sync",
      href: "/jarvis/pilot-requests",
    });
  }

  if (stats.hotLeads > 0) {
    recommendations.push({
      id: "hot-leads",
      text: `${stats.hotLeads} heiße Lead(s) — Erstkontakt vorbereiten`,
      href: "/jarvis/leads?filter=hot",
    });
  }

  const draftEmails = interactions.filter(
    (i) => i.type === "email" && i.status === "draft"
  ).length;
  if (draftEmails > 0) {
    recommendations.push({
      id: "draft-emails",
      text: `${draftEmails} E-Mail-Entwurf/Entwürfe zur Freigabe prüfen`,
      href: "/jarvis/drafts",
    });
  }

  if (stats.openFollowUps > 0) {
    recommendations.push({
      id: "follow-ups",
      text: `${stats.openFollowUps} offene Follow-up(s) bearbeiten`,
      href: "/jarvis/follow-ups",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "all-clear",
      text: "Keine dringenden Jarvis-Aufgaben — Pipeline prüfen",
      href: "/jarvis/pipeline",
    });
  }

  return {
    stats,
    recentEvents: (eventsRes.data ?? []) as JarvisEvent[],
    recommendations,
  };
}
