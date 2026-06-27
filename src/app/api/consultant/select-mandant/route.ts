import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompany } from "@/lib/company";
import { ACTIVE_MANDANT_COOKIE } from "@/lib/consultant/mandanten";
import { canUseFeature } from "@/lib/billingAccess";
import { isPlatformOwner } from "@/lib/jarvis/access";
import { getOrCreateProfile } from "@/lib/company";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { company: ownCompany } = await getOrCreateCompany(user.id);
  const profile = await getOrCreateProfile(user.id, user.email);
  const platformOwner = isPlatformOwner(user.email, profile?.role);

  if (!canUseFeature(ownCompany, "multi_tenant", platformOwner)) {
    return NextResponse.json(
      { error: "Für Mandanten ist der Consultant-Plan erforderlich." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const companyId = typeof body.companyId === "string" ? body.companyId : null;

  if (!companyId) {
    const response = NextResponse.json({ ok: true, activeCompanyId: ownCompany?.id ?? null });
    response.cookies.delete(ACTIVE_MANDANT_COOKIE);
    return response;
  }

  const { data: mandant } = await supabase
    .from("companies")
    .select("id, company_name, is_mandant")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mandant) {
    return NextResponse.json({ error: "Mandant nicht gefunden." }, { status: 404 });
  }

  if (!mandant.is_mandant && mandant.id !== ownCompany?.id) {
    return NextResponse.json({ error: "Ungültiger Mandant." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, activeCompanyId: companyId });
  response.cookies.set(ACTIVE_MANDANT_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
