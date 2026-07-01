import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateAuditFolderScore } from "@/lib/audit/audit-folders";
import type { Document } from "@/lib/types";
import type { CustomerEntityType } from "@/lib/jarvis/customer-message/types";
import type { CustomerProfileState } from "@/lib/jarvis/customer-message/automation-triggers";

const TERMINAL_LEAD_STATUSES = new Set(["won", "lost"]);

export async function evaluateCustomerProfile(
  supabase: SupabaseClient,
  entityType: CustomerEntityType,
  entityId: string
): Promise<CustomerProfileState | null> {
  if (entityType === "jarvis_lead") {
    const { data: lead } = await supabase
      .from("leads")
      .select("lead_score, status, notes")
      .eq("id", entityId)
      .maybeSingle();
    if (!lead) return null;

    const { count: interactionCount } = await supabase
      .from("lead_interactions")
      .select("*", { count: "exact", head: true })
      .eq("lead_id", entityId);

    const hasNotes = Boolean(lead.notes?.trim());
    const hasInteractions = (interactionCount ?? 0) > 0;

    return {
      riskScore: lead.lead_score ?? 0,
      documentMissing: !hasNotes && !hasInteractions,
      auditIncomplete: !TERMINAL_LEAD_STATUSES.has(lead.status),
    };
  }

  const { data: lead } = await supabase
    .from("b2b_outreach_leads")
    .select("nis2_relevance_score, outreach_message, processed_at, status, web_presence_status")
    .eq("id", entityId)
    .maybeSingle();
  if (!lead) return null;

  const nis2Score = lead.nis2_relevance_score ?? 0;
  const auditIncomplete =
    Boolean(lead.processed_at) &&
    !["customer", "skipped"].includes(lead.status) &&
    (lead.web_presence_status === "no_reliable_web_presence" ||
      lead.web_presence_status === "unclear_presence" ||
      lead.status === "ready");

  return {
    riskScore: Math.round(nis2Score * 10),
    documentMissing: Boolean(lead.processed_at) && !lead.outreach_message?.trim(),
    auditIncomplete,
  };
}

/** Profil für Mandanten/Unternehmen (Compliance-Kontext) */
export async function evaluateCompanyProfile(
  supabase: SupabaseClient,
  companyId: string
): Promise<CustomerProfileState | null> {
  const [{ data: company }, { data: documents }, { data: risks }] = await Promise.all([
    supabase.from("companies").select("compliance_score, nis2_status").eq("id", companyId).maybeSingle(),
    supabase.from("documents").select("document_type").eq("company_id", companyId),
    supabase.from("risks").select("risk_level").eq("company_id", companyId),
  ]);

  if (!company) return null;

  const highRisks = (risks ?? []).filter((r) => r.risk_level === "high").length;
  const compliance = company.compliance_score ?? 0;
  const riskScore = Math.min(100, Math.round(highRisks * 25 + Math.max(0, 100 - compliance)));

  const audit = calculateAuditFolderScore((documents ?? []) as Document[]);

  return {
    riskScore,
    documentMissing: audit.percent < 100,
    auditIncomplete: audit.percent < 100,
  };
}
