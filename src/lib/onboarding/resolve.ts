import type { SupabaseClient } from "@supabase/supabase-js";
import { activeOnly } from "@/lib/supabase/soft-delete";
import type { CompanyAsset } from "@/lib/assets/types";
import type { Company, Document, Measure, Risk } from "@/lib/types";
import {
  buildOnboardingStepViews,
  type OnboardingDataInput,
  type OnboardingStepView,
  computeOnboardingPercentFromViews,
  onboardingStepsToUpsert,
} from "@/lib/onboarding/evaluate";
import type { OnboardingProgressRow } from "@/lib/onboarding/steps";

export async function loadOnboardingData(
  supabase: SupabaseClient,
  companyId: string
): Promise<OnboardingDataInput> {
  const [
    companyRes,
    documentsRes,
    measuresRes,
    risksRes,
    assetsRes,
    evidenceRes,
    assessmentsRes,
    auditExportsRes,
    membersRes,
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
    activeOnly(supabase.from("documents").select("*").eq("company_id", companyId)),
    activeOnly(supabase.from("measures").select("*").eq("company_id", companyId)),
    activeOnly(supabase.from("risks").select("*").eq("company_id", companyId)),
    activeOnly(supabase.from("company_assets").select("*").eq("company_id", companyId)),
    supabase
      .from("evidence_items")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .is("deleted_at", null),
    activeOnly(
      supabase
        .from("nis2_assessments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
    ),
    supabase
      .from("audit_exports")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("active", true),
  ]);

  return {
    company: (companyRes.data as Company | null) ?? null,
    documents: (documentsRes.data ?? []) as Document[],
    measures: (measuresRes.data ?? []) as Measure[],
    risks: (risksRes.data ?? []) as Risk[],
    assets: (assetsRes.data ?? []) as CompanyAsset[],
    evidenceCount: evidenceRes.count ?? 0,
    assessmentCount: assessmentsRes.count ?? 0,
    auditExportCount: auditExportsRes.count ?? 0,
    teamMemberCount: membersRes.count ?? 0,
  };
}

export async function resolveOnboardingState(
  supabase: SupabaseClient,
  companyId: string,
  options?: { syncToDb?: boolean }
): Promise<{
  steps: OnboardingStepView[];
  percent: number;
  incomplete: string[];
  completedCount: number;
  isComplete: boolean;
}> {
  const [data, storedRes] = await Promise.all([
    loadOnboardingData(supabase, companyId),
    supabase.from("onboarding_progress").select("*").eq("company_id", companyId),
  ]);

  const storedRows = (storedRes.data ?? []) as OnboardingProgressRow[];
  const steps = buildOnboardingStepViews(data, storedRows);
  const { percent, incomplete, completedCount } = computeOnboardingPercentFromViews(steps);

  if (options?.syncToDb !== false) {
    const upserts = onboardingStepsToUpsert(companyId, steps);
    if (upserts.length > 0) {
      await supabase.from("onboarding_progress").upsert(
        upserts.map((row) => ({
          ...row,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "company_id,step_key" }
      );
    }
  }

  return {
    steps,
    percent,
    incomplete,
    completedCount,
    isComplete: percent >= 100,
  };
}
