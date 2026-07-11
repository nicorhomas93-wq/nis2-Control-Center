import type { Company } from "@/lib/types";
import type { AssetCategory, AssetCriticality } from "@/lib/assets/types";
import { DEFAULT_COMPANY_RISK_ASSET_NAME } from "@/lib/assets/types";
import { parseCriticalityArrays } from "@/lib/nis2/criticality-assessment";

export interface AssetCatalogEntry {
  name: string;
  category: AssetCategory;
  description: string;
  criticality: AssetCriticality;
}

export function inferCategoryFromAssetName(name: string): AssetCategory {
  const n = name.toLowerCase();
  if (
    n.includes("dienstleister") ||
    n.includes("lieferant") ||
    n.includes("extern") ||
    n.includes("anbieter")
  ) {
    return "external_providers";
  }
  if (
    n.includes("daten") ||
    n.includes("information") ||
    n.includes("dokument")
  ) {
    return "data";
  }
  if (
    n.includes("mitarbeit") ||
    n.includes("benutzer") ||
    n.includes("personal") ||
    n.includes("organisation") ||
    n.includes("allgemeines unternehmensrisiko")
  ) {
    return "organization";
  }
  return "it_systems";
}

/** Vorgeschlagene Assets pro Unternehmen — Basis für Dropdown und Risikoanalyse. */
export function buildSuggestedAssets(company: Company): AssetCatalogEntry[] {
  const cloudName = company.uses_microsoft_365
    ? "Microsoft 365 / Cloud-Dienste"
    : company.uses_cloud_services
      ? "Cloud-Dienste / SaaS"
      : "E-Mail & Kommunikationssysteme";

  const entries: AssetCatalogEntry[] = [
    {
      name: cloudName,
      category: "it_systems",
      description: "Zentrale Kommunikations- und Kollaborationsplattform",
      criticality: "high",
    },
    {
      name: "Backup-System",
      category: "it_systems",
      description: "Sicherung und Wiederherstellung geschäftskritischer Daten",
      criticality: "high",
    },
    {
      name: "Unternehmensdaten",
      category: "data",
      description: "Geschäfts- und personenbezogene Daten",
      criticality: "high",
    },
    {
      name: "Mitarbeitende / Benutzerkonten",
      category: "organization",
      description: "Menschliches Fehlverhalten und Zugangsberechtigungen",
      criticality: "medium",
    },
    {
      name: "Endgeräte",
      category: "it_systems",
      description: "Laptops, PCs und mobile Arbeitsgeräte",
      criticality: "medium",
    },
    {
      name: "Dienstleister / externe IT",
      category: "external_providers",
      description: "Externe IT- und Cloud-Dienstleister",
      criticality: "medium",
    },
    {
      name: DEFAULT_COMPANY_RISK_ASSET_NAME,
      category: "organization",
      description: "Übergreifende Risiken ohne spezifisches Einzelasset",
      criticality: "medium",
    },
  ];

  if (company.publicly_accessible_systems) {
    entries.push({
      name: "Öffentlich erreichbare Webanwendungen",
      category: "it_systems",
      description: "Nach außen erreichbare Systeme und Schnittstellen",
      criticality: "high",
    });
  }

  const criticality = parseCriticalityArrays(company);

  if (criticality.processed_data_types.includes("financial_data")) {
    entries.push({
      name: "Finanzdaten",
      category: "data",
      description: "Buchhaltungs-, Zahlungs- und Finanzinformationen",
      criticality: "high",
    });
  }

  if (criticality.processed_data_types.includes("health_data")) {
    entries.push({
      name: "Gesundheitsdaten",
      category: "data",
      description: "Besonders schützenswerte personenbezogene Daten",
      criticality: "high",
    });
  }

  if (criticality.infrastructure_types.includes("critical_networks")) {
    entries.push({
      name: "Kritische Netzwerke",
      category: "it_systems",
      description: "Segmente mit erhöhtem Schutzbedarf",
      criticality: "high",
    });
  }

  if (criticality.infrastructure_types.includes("vpn")) {
    entries.push({
      name: "VPN-Zugänge",
      category: "it_systems",
      description: "Fernzugriff und sichere Verbindungen",
      criticality: "high",
    });
  }

  return entries;
}

export function catalogEntryForAssetName(
  name: string,
  company: Company
): AssetCatalogEntry {
  const suggested = buildSuggestedAssets(company).find(
    (e) => e.name.toLowerCase() === name.toLowerCase()
  );
  if (suggested) return suggested;

  return {
    name,
    category: inferCategoryFromAssetName(name),
    description: "",
    criticality: "medium",
  };
}
