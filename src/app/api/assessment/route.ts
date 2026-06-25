import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { assessNis2 } from "@/lib/nis2/betroffenheit";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { companyId } = await request.json();
  if (!companyId) return NextResponse.json({ error: "companyId erforderlich" }, { status: 400 });

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const result = assessNis2(company);

  const { error: updateError } = await supabase
    .from("companies")
    .update({ nis2_status: result.status, compliance_score: result.score })
    .eq("id", companyId);

  if (updateError && isMissingTableError(updateError)) {
    return NextResponse.json({ error: getDbErrorMessage(updateError), missingTable: true }, { status: 503 });
  }

  const { error: insertError } = await supabase.from("nis2_assessments").insert({
    company_id: companyId,
    result: result.status,
    reasoning: result.reasoning,
    score: result.score,
  });

  if (insertError) {
    return NextResponse.json(
      { error: getDbErrorMessage(insertError), missingTable: isMissingTableError(insertError) },
      { status: isMissingTableError(insertError) ? 503 : 500 }
    );
  }

  return NextResponse.json(result);
}
