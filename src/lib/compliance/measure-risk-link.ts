import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isRiskTreated,
  resolveRiskTreatmentStatus,
  type RiskTreatmentStatus,
} from "@/lib/compliance/risk-treatment";
import { isWorkComplete } from "@/lib/compliance/obligations";
import type { Measure, Risk } from "@/lib/types";

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function suggestRiskLinkForMeasure(measure: Measure, risks: Risk[]): string | null {
  if (measure.risk_id) return measure.risk_id;

  const title = normalizeText(measure.title);

  for (const risk of risks) {
    const riskMeasure = risk.measure ? normalizeText(risk.measure) : "";
    if (riskMeasure && (title === riskMeasure || title.includes(riskMeasure) || riskMeasure.includes(title))) {
      return risk.id;
    }
  }

  for (const risk of risks) {
    if (measure.asset_id && risk.asset_id === measure.asset_id) {
      const threat = normalizeText(risk.threat);
      if (threat && (measure.description?.toLowerCase().includes(threat) || title.includes(threat))) {
        return risk.id;
      }
    }
  }

  return null;
}

export async function autoLinkMeasureToRisk(
  supabase: SupabaseClient,
  measureId: string,
  companyId: string
): Promise<string | null> {
  const { data: measure } = await supabase
    .from("measures")
    .select("*")
    .eq("id", measureId)
    .single();

  if (!measure) return null;
  if (measure.risk_id) return measure.risk_id;

  const { data: risks } = await supabase.from("risks").select("*").eq("company_id", companyId);
  const riskId = suggestRiskLinkForMeasure(measure as Measure, (risks ?? []) as Risk[]);
  if (!riskId) return null;

  await supabase.from("measures").update({ risk_id: riskId }).eq("id", measureId);
  return riskId;
}

export async function reconcileRiskTreatment(
  supabase: SupabaseClient,
  riskId: string
): Promise<Risk | null> {
  const { data: risk } = await supabase.from("risks").select("*").eq("id", riskId).single();
  if (!risk) return null;

  const { data: measures } = await supabase.from("measures").select("*").eq("risk_id", riskId);
  const linked = (measures ?? []) as Measure[];
  const riskRow = risk as Risk;

  if (!isRiskTreated(riskRow, linked)) {
    if (
      (riskRow.treatment_status === "treated" || riskRow.treatment_status === "reduced") &&
      linked.some((m) => !isWorkComplete(m.status))
    ) {
      const { data: reopened } = await supabase
        .from("risks")
        .update({ treatment_status: "open" })
        .eq("id", riskId)
        .select()
        .single();
      return (reopened as Risk) ?? null;
    }
    return riskRow;
  }

  const treatment_status: RiskTreatmentStatus = resolveRiskTreatmentStatus(riskRow, linked);
  const { data: updated } = await supabase
    .from("risks")
    .update({ treatment_status })
    .eq("id", riskId)
    .select()
    .single();

  return (updated as Risk) ?? null;
}

export async function reconcileMeasureCompliance(
  supabase: SupabaseClient,
  measureId: string,
  companyId: string
): Promise<Risk | null> {
  const riskId = await autoLinkMeasureToRisk(supabase, measureId, companyId);
  if (!riskId) return null;
  return reconcileRiskTreatment(supabase, riskId);
}
