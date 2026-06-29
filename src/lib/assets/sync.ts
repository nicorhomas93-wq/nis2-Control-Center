import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildSuggestedAssets,
  catalogEntryForAssetName,
  type AssetCatalogEntry,
} from "@/lib/assets/catalog";
import { DEFAULT_COMPANY_RISK_ASSET_NAME } from "@/lib/assets/types";
import type { Company } from "@/lib/types";
import type { CompanyAsset } from "@/lib/assets/types";
import { isPlaceholderValue } from "@/lib/compliance/risk-display";

async function upsertAsset(
  supabase: SupabaseClient,
  companyId: string,
  entry: AssetCatalogEntry
): Promise<CompanyAsset | null> {
  const { data: existing } = await supabase
    .from("company_assets")
    .select("*")
    .eq("company_id", companyId)
    .ilike("name", entry.name)
    .maybeSingle();

  if (existing) return existing as CompanyAsset;

  const { data, error } = await supabase
    .from("company_assets")
    .insert({
      company_id: companyId,
      name: entry.name,
      category: entry.category,
      description: entry.description || null,
      criticality: entry.criticality,
    })
    .select()
    .single();

  if (error) return null;
  return data as CompanyAsset;
}

export async function ensureSuggestedAssets(
  supabase: SupabaseClient,
  companyId: string,
  company: Company
): Promise<CompanyAsset[]> {
  const suggested = buildSuggestedAssets(company);
  const results: CompanyAsset[] = [];

  for (const entry of suggested) {
    const asset = await upsertAsset(supabase, companyId, entry);
    if (asset) results.push(asset);
  }

  return results;
}

export async function resolveAssetIdForRisk(
  supabase: SupabaseClient,
  companyId: string,
  company: Company,
  assetName: string | null | undefined,
  assetsCache?: CompanyAsset[]
): Promise<{ assetId: string | null; assetName: string }> {
  const assets =
    assetsCache ?? (await ensureSuggestedAssets(supabase, companyId, company));

  const normalizedName = isPlaceholderValue(assetName)
    ? DEFAULT_COMPANY_RISK_ASSET_NAME
    : assetName!.trim();

  const match = assets.find(
    (a) => a.name.toLowerCase() === normalizedName.toLowerCase()
  );
  if (match) {
    return { assetId: match.id, assetName: match.name };
  }

  const entry = catalogEntryForAssetName(normalizedName, company);
  const created = await upsertAsset(supabase, companyId, entry);
  if (created) {
    return { assetId: created.id, assetName: created.name };
  }

  const fallback = assets.find(
    (a) => a.name === DEFAULT_COMPANY_RISK_ASSET_NAME
  );
  return {
    assetId: fallback?.id ?? null,
    assetName: fallback?.name ?? DEFAULT_COMPANY_RISK_ASSET_NAME,
  };
}

export async function attachAssetsToRiskRows<T extends { asset: string }>(
  supabase: SupabaseClient,
  companyId: string,
  company: Company,
  rows: T[]
): Promise<Array<T & { asset_id: string | null; asset: string }>> {
  const assets = await ensureSuggestedAssets(supabase, companyId, company);
  const enriched: Array<T & { asset_id: string | null; asset: string }> = [];

  for (const row of rows) {
    const resolved = await resolveAssetIdForRisk(
      supabase,
      companyId,
      company,
      row.asset,
      assets
    );
    enriched.push({
      ...row,
      asset: resolved.assetName,
      asset_id: resolved.assetId,
    });
  }

  return enriched;
}
