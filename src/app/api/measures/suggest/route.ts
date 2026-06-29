import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { resolveRiskAsset } from "@/lib/assets/resolve";
import { suggestMeasureForRisk, suggestMeasureFromRisk } from "@/lib/measures/suggestions";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import type { CompanyAsset } from "@/lib/assets/types";
import type { Risk } from "@/lib/types";
import type { AssetCategory } from "@/lib/assets/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, riskId, threat, vulnerability, assetName, assetCategory } = body;

  if (!companyId) {
    return NextResponse.json({ error: "companyId erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  if (riskId) {
    const { data: risk } = await supabase
      .from("risks")
      .select("*")
      .eq("id", riskId)
      .single();

    if (!risk) return NextResponse.json({ error: "Risiko nicht gefunden" }, { status: 404 });

    const { data: assets } = await supabase
      .from("company_assets")
      .select("*")
      .eq("company_id", companyId);

    const suggestion = suggestMeasureForRisk(
      risk as Risk,
      (assets ?? []) as CompanyAsset[]
    );

    return NextResponse.json({ suggestion, riskId });
  }

  const suggestion = suggestMeasureFromRisk({
    threat,
    vulnerability,
    assetName: assetName ?? "Allgemeines Unternehmensrisiko",
    assetCategory: assetCategory as AssetCategory | undefined,
  });

  return NextResponse.json({ suggestion });
}
