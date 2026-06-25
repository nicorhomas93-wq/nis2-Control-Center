import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  buildRiskAnalysisPrompt,
  generateFallbackRiskAnalysis,
  generateWithAI,
} from "@/lib/ai/generate";
import type { RiskLevel } from "@/lib/types";

function parseRisksFromAnalysis(content: string, companyId: string) {
  const lines = content.split("\n").filter((l) => l.includes("|") && !l.startsWith("---") && !l.toLowerCase().includes("asset"));
  return lines.slice(0, 6).map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    const level = (parts[2]?.toLowerCase().includes("hoch") ? "high" : parts[2]?.toLowerCase().includes("niedrig") ? "low" : "medium") as RiskLevel;
    return {
      company_id: companyId,
      asset: parts[0] || "IT-System",
      threat: parts[1] || "Unbekannte Bedrohung",
      risk_level: level,
      measure: parts[3] || null,
      analysis_content: content,
    };
  });
}

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

  const riskRows = parseRisksFromAnalysis(analysis, companyId);
  const { data: risks, error } = await supabase.from("risks").insert(riskRows).select();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  return NextResponse.json({ analysis, risks, mode: aiContent ? "openai" : "demo" });
}
