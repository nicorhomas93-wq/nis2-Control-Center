import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  buildRiskAnalysisPrompt,
  generateFallbackRiskAnalysis,
  generateWithAI,
} from "@/lib/ai/generate";
import { buildQualityRiskRows } from "@/lib/compliance/risk-rows";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { companyId } = await request.json();
  if (!companyId) return NextResponse.json({ error: "companyId erforderlich" }, { status: 400 });

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const prompt = buildRiskAnalysisPrompt(company);
  const aiContent = await generateWithAI(prompt);
  const analysis = aiContent ?? generateFallbackRiskAnalysis(company);

  await supabase.from("risks").delete().eq("company_id", companyId);

  const riskRows = buildQualityRiskRows(company, analysis);
  const { data: risks, error } = await supabase.from("risks").insert(riskRows).select();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  await syncCompanySecurityScore(supabase, companyId);

  return NextResponse.json({ analysis, risks, mode: aiContent ? "openai" : "demo" });
}
