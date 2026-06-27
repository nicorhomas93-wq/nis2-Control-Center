import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompany, getOrCreateProfile } from "@/lib/company";
import { createMandant, listMandanten } from "@/lib/consultant/mandanten";
import { canUseFeature } from "@/lib/billingAccess";
import { isPlatformOwner } from "@/lib/jarvis/access";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { company } = await getOrCreateCompany(user.id);
  const profile = await getOrCreateProfile(user.id, user.email);
  const platformOwner = isPlatformOwner(user.email, profile?.role);

  if (!canUseFeature(company, "multi_tenant", platformOwner)) {
    return NextResponse.json(
      { error: "Für Mandanten ist der Consultant-Plan erforderlich." },
      { status: 403 }
    );
  }

  const { mandanten, error } = await listMandanten(user.id);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ mandanten });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { company } = await getOrCreateCompany(user.id);
  const profile = await getOrCreateProfile(user.id, user.email);
  const platformOwner = isPlatformOwner(user.email, profile?.role);

  if (!canUseFeature(company, "multi_tenant", platformOwner)) {
    return NextResponse.json(
      { error: "Für Mandanten ist der Consultant-Plan erforderlich." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const company_name = typeof body.company_name === "string" ? body.company_name : "";
  const industry = typeof body.industry === "string" ? body.industry : null;

  const { mandant, error } = await createMandant(user.id, {
    company_name,
    industry,
  });

  if (error || !mandant) {
    return NextResponse.json(
      { error: error ?? "Mandant konnte nicht angelegt werden." },
      { status: 400 }
    );
  }

  return NextResponse.json({ mandant });
}
