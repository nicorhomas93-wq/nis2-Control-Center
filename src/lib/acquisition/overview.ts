import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAcquisitionOverview() {
  const admin = createAdminClient();
  if (!admin) {
    return {
      visitors: 0,
      checksCompleted: 0,
      leads: 0,
      nurturing: 0,
      retargetingEligible: 0,
      avgScore: 0,
      emailsPending: 0,
      emailsSent: 0,
      recentLeads: [],
      recentEvents: [],
    };
  }

  const [
    visitorsRes,
    checksRes,
    leadsRes,
    retargetRes,
    emailsPendingRes,
    emailsSentRes,
    recentLeadsRes,
    recentEventsRes,
  ] = await Promise.all([
    admin.from("acquisition_visitors").select("id", { count: "exact", head: true }),
    admin
      .from("acquisition_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "check_completed"),
    admin.from("acquisition_leads").select("id", { count: "exact", head: true }),
    admin
      .from("acquisition_visitors")
      .select("id", { count: "exact", head: true })
      .eq("retargeting_eligible", true),
    admin
      .from("acquisition_email_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("acquisition_email_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),
    admin
      .from("acquisition_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("acquisition_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const { data: scoreRows } = await admin
    .from("acquisition_leads")
    .select("acquisition_score");

  const scores = (scoreRows ?? []).map((r) => r.acquisition_score);
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const { count: nurturing } = await admin
    .from("acquisition_leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "nurturing");

  return {
    visitors: visitorsRes.count ?? 0,
    checksCompleted: checksRes.count ?? 0,
    leads: leadsRes.count ?? 0,
    nurturing: nurturing ?? 0,
    retargetingEligible: retargetRes.count ?? 0,
    avgScore,
    emailsPending: emailsPendingRes.count ?? 0,
    emailsSent: emailsSentRes.count ?? 0,
    recentLeads: recentLeadsRes.data ?? [],
    recentEvents: recentEventsRes.data ?? [],
  };
}
