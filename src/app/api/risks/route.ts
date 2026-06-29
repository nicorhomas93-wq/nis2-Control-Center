import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const {
    id,
    is_mandatory,
    criticality,
    deadline,
    escalation_level,
    responsible,
    vulnerability,
    business_impact,
  } = body;

  const { data: risk } = await supabase.from("risks").select("id, company_id").eq("id", id).single();
  if (!risk) return NextResponse.json({ error: "Risiko nicht gefunden" }, { status: 404 });

  const company = await verifyCompanyOwnership(user.id, risk.company_id);
  if (!company) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });

  const updates: Record<string, unknown> = {};
  if (is_mandatory !== undefined) updates.is_mandatory = Boolean(is_mandatory);
  if (criticality !== undefined) updates.criticality = criticality;
  if (deadline !== undefined) updates.deadline = deadline || null;
  if (escalation_level !== undefined) updates.escalation_level = escalation_level;
  if (responsible !== undefined) updates.responsible = responsible;
  if (vulnerability !== undefined) updates.vulnerability = vulnerability;
  if (business_impact !== undefined) updates.business_impact = business_impact;

  const { error } = await supabase.from("risks").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });

  await syncCompanySecurityScore(supabase, risk.company_id);

  return NextResponse.json({ success: true });
}
