import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { ensureSuggestedAssets } from "@/lib/assets/sync";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import type { AssetCategory, AssetCriticality } from "@/lib/assets/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  await ensureSuggestedAssets(supabase, companyId, company);

  const { data, error } = await supabase
    .from("company_assets")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  return NextResponse.json({ assets: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, name, category, description, criticality } = body;

  if (!companyId || !name || !category) {
    return NextResponse.json(
      { error: "companyId, name und category erforderlich" },
      { status: 400 }
    );
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: asset, error } = await supabase
    .from("company_assets")
    .insert({
      company_id: companyId,
      name: String(name).trim(),
      category: category as AssetCategory,
      description: description ?? null,
      criticality: (criticality as AssetCriticality) ?? "medium",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  return NextResponse.json({ asset });
}
