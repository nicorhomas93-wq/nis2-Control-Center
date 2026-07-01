import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyPermission } from "@/lib/team/access";
import { loadEntityActivity, logActivity } from "@/lib/activity/log";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!companyId || !entityType || !entityId) {
    return NextResponse.json({ error: "companyId, entityType und entityId erforderlich" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "company.read");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const activity = await loadEntityActivity(supabase, companyId, entityType, entityId);
  return NextResponse.json({ activity });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, entityType, entityId, comment } = body;

  if (!companyId || !entityType || !entityId || !comment?.trim()) {
    return NextResponse.json({ error: "Parameter fehlen" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "comments.write");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { error } = await supabase.from("activity_log").insert({
    company_id: companyId,
    user_id: user.id,
    action: "comment_added",
    entity_type: entityType,
    entity_id: entityId,
    comment: comment.trim(),
  });

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
