import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const {
    companyId,
    title,
    description,
    priority,
    responsible,
    target_state,
    is_mandatory,
    criticality,
    deadline,
    escalation_level,
  } = body;

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: measure, error } = await supabase.from("measures").insert({
    company_id: companyId,
    title,
    description,
    priority: priority ?? "medium",
    criticality: criticality ?? priority ?? "medium",
    responsible,
    target_state,
    status: "open",
    is_mandatory: Boolean(is_mandatory),
    deadline: deadline || null,
    escalation_level: escalation_level ?? 0,
  }).select().single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  await syncCompanySecurityScore(supabase, companyId);

  return NextResponse.json({ measure });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { id, status, is_mandatory, criticality, deadline, escalation_level, responsible } = body;

  const { data: measure } = await supabase.from("measures").select("id, company_id").eq("id", id).single();
  if (!measure) return NextResponse.json({ error: "Maßnahme nicht gefunden" }, { status: 404 });

  const company = await verifyCompanyOwnership(user.id, measure.company_id);
  if (!company) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (is_mandatory !== undefined) updates.is_mandatory = Boolean(is_mandatory);
  if (criticality !== undefined) updates.criticality = criticality;
  if (deadline !== undefined) updates.deadline = deadline || null;
  if (escalation_level !== undefined) updates.escalation_level = escalation_level;
  if (responsible !== undefined) updates.responsible = responsible;

  const { error } = await supabase.from("measures").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });

  await syncCompanySecurityScore(supabase, measure.company_id);

  return NextResponse.json({ success: true });
}
