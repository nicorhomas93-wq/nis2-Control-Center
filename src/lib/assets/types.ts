export type AssetCategory =
  | "it_systems"
  | "data"
  | "organization"
  | "external_providers";

export type AssetCriticality = "low" | "medium" | "high";

export interface CompanyAsset {
  id: string;
  company_id: string;
  name: string;
  category: AssetCategory;
  description: string | null;
  criticality: AssetCriticality;
  created_at: string;
  updated_at: string;
}

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  it_systems: "IT-Systeme",
  data: "Daten",
  organization: "Organisation",
  external_providers: "Externe Dienstleister",
};

export const ASSET_CRITICALITY_LABELS: Record<AssetCriticality, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

export const DEFAULT_COMPANY_RISK_ASSET_NAME = "Allgemeines Unternehmensrisiko";
