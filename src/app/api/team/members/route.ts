import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyPermission } from "@/lib/team/access";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { ROLE_LABELS } from "@/lib/team/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId fehlt" }, { status: 400 });

  const access = await requireCompanyPermission(user.id, companyId, "company.read");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: members, error } = await supabase
    .from("company_members")
    .select("*, profiles:user_id (email, full_name, last_active_at)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: 500 }
    );
  }

  const rows = (members ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      userId: m.user_id,
      role: m.role,
      roleLabel: ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role,
      active: m.active,
      email: profile?.email ?? null,
      name: profile?.full_name ?? null,
      lastActiveAt: profile?.last_active_at ?? null,
      createdAt: m.created_at,
    };
  });

  return NextResponse.json({ members: rows, currentRole: access.role });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, memberId, role, active } = body;
  if (!companyId || !memberId) {
    return NextResponse.json({ error: "companyId und memberId erforderlich" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "users.manage");
  if ("error" in access) {
    const fallback = await requireCompanyPermission(user.id, companyId, "users.deactivate");
    if ("error" in fallback) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (role !== undefined) updates.role = role;
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabase
    .from("company_members")
    .update(updates)
    .eq("id", memberId)
    .eq("company_id", companyId)
    .neq("role", "owner")
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({ member: data });
}
