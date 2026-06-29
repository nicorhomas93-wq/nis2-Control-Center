import { isPlaceholderValue } from "@/lib/compliance/risk-display";
import {
  ASSET_CATEGORY_LABELS,
  DEFAULT_COMPANY_RISK_ASSET_NAME,
  type AssetCategory,
  type CompanyAsset,
} from "@/lib/assets/types";
import { inferCategoryFromAssetName } from "@/lib/assets/catalog";
import type { Risk } from "@/lib/types";

export interface ResolvedAsset {
  name: string;
  category: AssetCategory;
  categoryLabel: string;
}

export function resolveRiskAsset(
  risk: Pick<Risk, "asset" | "asset_id">,
  assets: CompanyAsset[]
): ResolvedAsset {
  if (risk.asset_id) {
    const linked = assets.find((a) => a.id === risk.asset_id);
    if (linked) {
      return {
        name: linked.name,
        category: linked.category,
        categoryLabel: ASSET_CATEGORY_LABELS[linked.category],
      };
    }
  }

  if (!isPlaceholderValue(risk.asset)) {
    const category = inferCategoryFromAssetName(risk.asset);
    return {
      name: risk.asset,
      category,
      categoryLabel: ASSET_CATEGORY_LABELS[category],
    };
  }

  return {
    name: DEFAULT_COMPANY_RISK_ASSET_NAME,
    category: "organization",
    categoryLabel: ASSET_CATEGORY_LABELS.organization,
  };
}

export function resolveAssetName(
  risk: Pick<Risk, "asset" | "asset_id">,
  assets: CompanyAsset[]
): string {
  return resolveRiskAsset(risk, assets).name;
}
