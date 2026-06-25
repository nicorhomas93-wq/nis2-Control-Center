import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { companyId, title, description, priority, responsible, target_state } = await request.json();

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: measure, error } = await supabase.from("measures").insert({
    company_id: companyId,
    title,
    description,
    priority: priority ?? "medium",
    responsible,
    target_state,
    status: "open",
  }).select().single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  return NextResponse.json({ measure });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id, status } = await request.json();

  const { data: measure } = await supabase.from("measures").select("id, company_id").eq("id", id).single();
  if (!measure) return NextResponse.json({ error: "Maßnahme nicht gefunden" }, { status: 404 });

  const company = await verifyCompanyOwnership(user.id, measure.company_id);
  if (!company) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });

  const { error } = await supabase.from("measures").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });

  return NextResponse.json({ success: true });
}
