import type { SupabaseClient } from "@supabase/supabase-js";
import { buildComplianceSnapshot } from "@/lib/compliance/snapshot";
import type { SecurityScoreSnapshot } from "@/lib/compliance/types";
import type { Company, Document, Incident, Measure, Risk } from "@/lib/types";

export async function loadCompanyComplianceData(
  supabase: SupabaseClient,
  companyId: string
): Promise<{
  company: Company | null;
  documents: Document[];
  measures: Measure[];
  risks: Risk[];
  incidents: Incident[];
}> {
  const [companyRes, documentsRes, measuresRes, risksRes, incidentsRes] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
    supabase.from("documents").select("*").eq("company_id", companyId),
    supabase.from("measures").select("*").eq("company_id", companyId),
    supabase.from("risks").select("*").eq("company_id", companyId),
    supabase.from("incidents").select("*").eq("company_id", companyId),
  ]);

  return {
    company: (companyRes.data as Company | null) ?? null,
    documents: (documentsRes.data ?? []) as Document[],
    measures: (measuresRes.data ?? []) as Measure[],
    risks: (risksRes.data ?? []) as Risk[],
    incidents: (incidentsRes.data ?? []) as Incident[],
  };
}

export async function syncCompanySecurityScore(
  supabase: SupabaseClient,
  companyId: string
): Promise<void> {
  await syncAndReturnSecurityStatus(supabase, companyId);
}

export async function syncAndReturnComplianceSnapshot(
  supabase: SupabaseClient,
  companyId: string
) {
  const data = await loadCompanyComplianceData(supabase, companyId);
  const snapshot = buildComplianceSnapshot({
    company: data.company,
    documents: data.documents,
    measures: data.measures,
    risks: data.risks,
    incidents: data.incidents,
  });
  const status = snapshot.securityStatus;
  const today = new Date().toISOString().slice(0, 10);

  await supabase.from("companies").update({ security_score: status.score }).eq("id", companyId);

  await supabase.from("security_score_snapshots").upsert(
    {
      company_id: companyId,
      score: status.score,
      level: status.level,
      summary: status.summary,
      drivers: status.drivers.slice(0, 10),
      recorded_at: today,
    },
    { onConflict: "company_id,recorded_at" }
  );

  return snapshot;
}

export async function syncAndReturnSecurityStatus(
  supabase: SupabaseClient,
  companyId: string
) {
  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return snapshot.securityStatus;
}

export async function loadSecurityScoreHistory(
  supabase: SupabaseClient,
  companyId: string,
  days = 30
): Promise<SecurityScoreSnapshot[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("security_score_snapshots")
    .select("recorded_at, score, level")
    .eq("company_id", companyId)
    .gte("recorded_at", since.toISOString().slice(0, 10))
    .order("recorded_at", { ascending: true });

  return (data ?? []) as SecurityScoreSnapshot[];
}
