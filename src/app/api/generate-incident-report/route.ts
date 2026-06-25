import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  buildIncidentReportPrompt,
  generateFallbackIncidentReport,
  generateWithAI,
} from "@/lib/ai/generate";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { companyId, title, description } = await request.json();

  if (!companyId || !title || !description) {
    return NextResponse.json({ error: "companyId, title und description erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const prompt = buildIncidentReportPrompt(company, title, description);
  const aiContent = await generateWithAI(prompt);
  const reportContent = aiContent ?? generateFallbackIncidentReport(company, title, description);

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      company_id: companyId,
      title,
      description,
      report_content: reportContent,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  return NextResponse.json({ incident, mode: aiContent ? "openai" : "demo" });
}
