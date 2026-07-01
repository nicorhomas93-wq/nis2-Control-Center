import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyPermission } from "@/lib/team/access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { loadEntityActivity } from "@/lib/activity/log";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(_request.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId fehlt" }, { status: 400 });

  const access = await requireCompanyPermission(user.id, companyId, "company.read");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: task, error } = await supabase
    .from("task_items")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error || !task) {
    return NextResponse.json({ error: "Aufgabe nicht gefunden" }, { status: 404 });
  }

  const [activity, evidence] = await Promise.all([
    loadEntityActivity(supabase, companyId, "task", id),
    supabase
      .from("evidence_items")
      .select("*")
      .eq("task_id", id)
      .is("deleted_at", null),
  ]);

  return NextResponse.json({
    task,
    activity,
    evidence: evidence.data ?? [],
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, comment } = body;
  if (!companyId || !comment) {
    return NextResponse.json({ error: "companyId und comment erforderlich" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "comments.write");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { error } = await supabase.from("activity_log").insert({
    company_id: companyId,
    user_id: user.id,
    action: "comment_added",
    entity_type: "task",
    entity_id: id,
    comment,
  });

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
