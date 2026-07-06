import { DashboardShell } from "@/components/layout/DashboardShell";
import { JarvisShell } from "@/components/jarvis/JarvisShell";
import { TrafficShell } from "@/components/jarvis/traffic/TrafficShell";
import { B2BOutreachDashboard } from "@/components/jarvis/outreach/B2BOutreachDashboard";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { createClient } from "@/lib/supabase/server";
import { getOutreachQuotaInfo } from "@/lib/jarvis/outreach/processor";
import { OUTREACH_DAILY_SEND_LIMIT } from "@/lib/jarvis/outreach/constants";
import { mapOutreachLead } from "@/lib/jarvis/outreach/outreach-lead-map";
import { isMissingTableError } from "@/lib/supabase/db-error";
import { redirect } from "next/navigation";
import { canAccessJarvis } from "@/lib/jarvis/access";

import type { B2BOutreachLead } from "@/lib/types";

function mapLead(row: Record<string, unknown>): B2BOutreachLead {
  return mapOutreachLead(row);
}

export default async function B2BOutreachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canAccessJarvis(user.email, profile?.role)) {
    redirect("/dashboard");
  }

  const { data, error } = await supabase
    .from("b2b_outreach_leads")
    .select("*")
    .order("lead_quality_score", { ascending: false, nullsFirst: false })
    .order("partner_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(300);

  let quota = await getOutreachQuotaInfo(supabase);

  if (error) {
    quota = {
      sendLimit: OUTREACH_DAILY_SEND_LIMIT,
      sentToday: 0,
      sendRemaining: OUTREACH_DAILY_SEND_LIMIT,
      sendLimitReached: false,
      analyzedToday: 0,
    };
  }

  return (
    <DashboardShell>
      {error && isMissingTableError(error) && <SupabaseSetupBanner />}
      <JarvisShell>
        <TrafficShell>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Jarvis Lead Finder</h2>
            <p className="text-sm text-slate-500">
              Hochwertige, kontaktierbare B2B-Partner — IT-Dienstleister, MSP, Cybersecurity und
              Compliance-Berater. Qualität vor Quantität (intern, kein Auto-Versand).{" "}
              <a href="/jarvis/lead-research" className="text-brand-700 hover:underline">
                → Lead Research
              </a>
            </p>
          </div>
          {!error && (
            <B2BOutreachDashboard
              leads={(data ?? []).map(mapLead)}
              quota={quota}
            />
          )}
          {error && !isMissingTableError(error) && (
            <p className="text-sm text-red-600">{error.message}</p>
          )}
        </TrafficShell>
      </JarvisShell>
    </DashboardShell>
  );
}
