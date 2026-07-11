import type { Company } from "@/lib/types";

export type BusinessCriticalityType =
  | "supporting"
  | "business_critical"
  | "time_critical"
  | "production"
  | "customer_critical"
  | "security_critical"
  | "high_critical";

export type ProcessedDataType =
  | "personal_data"
  | "employee_data"
  | "customer_data"
  | "financial_data"
  | "contract_data"
  | "health_data"
  | "rd_data"
  | "trade_secrets"
  | "critical_operational_data";

export type InfrastructureType =
  | "local_servers"
  | "cloud"
  | "hybrid"
  | "remote_work"
  | "vpn"
  | "mobile_devices"
  | "internet_exposed"
  | "critical_networks";

export type CriticalityLevel = "unbekannt" | "niedrig" | "mittel" | "hoch" | "kritisch";

export interface CriticalityOption<T extends string> {
  id: T;
  label: string;
  points: number;
  hint?: string;
}

export const BUSINESS_CRITICALITY_OPTIONS: CriticalityOption<BusinessCriticalityType>[] = [
  { id: "supporting", label: "Unterstützende Prozesse", points: 5 },
  { id: "business_critical", label: "Geschäftskritische Prozesse", points: 15 },
  { id: "time_critical", label: "Zeitkritische Prozesse", points: 20 },
  { id: "production", label: "Produktionsrelevante Prozesse", points: 20 },
  { id: "customer_critical", label: "Kundenkritische Prozesse", points: 15 },
  { id: "security_critical", label: "Sicherheitskritische Prozesse", points: 25 },
  { id: "high_critical", label: "Hochkritische Prozesse", points: 30 },
];

export const PROCESSED_DATA_OPTIONS: CriticalityOption<ProcessedDataType>[] = [
  { id: "personal_data", label: "Personenbezogene Daten", points: 10 },
  { id: "employee_data", label: "Mitarbeiterdaten", points: 5 },
  { id: "customer_data", label: "Kundendaten", points: 10 },
  { id: "financial_data", label: "Finanzdaten", points: 15 },
  { id: "contract_data", label: "Vertragsdaten", points: 10 },
  { id: "health_data", label: "Gesundheitsdaten", points: 25 },
  { id: "rd_data", label: "Forschungs- und Entwicklungsdaten", points: 20 },
  { id: "trade_secrets", label: "Betriebsgeheimnisse", points: 25 },
  { id: "critical_operational_data", label: "Kritische Betriebsdaten", points: 20 },
];

export const INFRASTRUCTURE_OPTIONS: CriticalityOption<InfrastructureType>[] = [
  { id: "local_servers", label: "Lokale Server", points: 10 },
  { id: "cloud", label: "Cloud-Dienste", points: 5 },
  { id: "hybrid", label: "Hybrid-Infrastruktur", points: 10 },
  { id: "remote_work", label: "Remote-Arbeitsplätze", points: 5 },
  { id: "vpn", label: "VPN-Zugänge", points: 5 },
  { id: "mobile_devices", label: "Mobile Endgeräte", points: 5 },
  { id: "internet_exposed", label: "Internet-exponierte Systeme", points: 20 },
  { id: "critical_networks", label: "Kritische Netzwerke", points: 15 },
];

export interface CriticalityScores {
  business: number;
  data: number;
  infrastructure: number;
  total: number;
  level: CriticalityLevel;
}

function sumPoints<T extends string>(
  selected: T[],
  options: CriticalityOption<T>[]
): number {
  const map = new Map(options.map((o) => [o.id, o.points]));
  return selected.reduce((sum, id) => sum + (map.get(id) ?? 0), 0);
}

export function resolveCriticalityLevel(total: number, hasSelections: boolean): CriticalityLevel {
  if (!hasSelections) return "unbekannt";
  if (total >= 120) return "kritisch";
  if (total >= 80) return "hoch";
  if (total >= 40) return "mittel";
  return "niedrig";
}

export function calculateCriticalityScores(input: {
  business_criticality_types: BusinessCriticalityType[];
  processed_data_types: ProcessedDataType[];
  infrastructure_types: InfrastructureType[];
}): CriticalityScores {
  const business = sumPoints(input.business_criticality_types, BUSINESS_CRITICALITY_OPTIONS);
  const data = sumPoints(input.processed_data_types, PROCESSED_DATA_OPTIONS);
  const infrastructure = sumPoints(input.infrastructure_types, INFRASTRUCTURE_OPTIONS);
  const total = business + data + infrastructure;
  const hasSelections =
    input.business_criticality_types.length > 0 ||
    input.processed_data_types.length > 0 ||
    input.infrastructure_types.length > 0;

  return {
    business,
    data,
    infrastructure,
    total,
    level: resolveCriticalityLevel(total, hasSelections),
  };
}

export function getCriticalityLevelLabel(level: CriticalityLevel): string {
  const labels: Record<CriticalityLevel, string> = {
    unbekannt: "Noch nicht bewertet",
    niedrig: "Niedrig",
    mittel: "Mittel",
    hoch: "Hoch",
    kritisch: "Kritisch",
  };
  return labels[level];
}

export function getCriticalityLevelColor(level: CriticalityLevel): string {
  const colors: Record<CriticalityLevel, string> = {
    unbekannt: "bg-slate-100 text-slate-700",
    niedrig: "bg-emerald-100 text-emerald-800",
    mittel: "bg-amber-100 text-amber-800",
    hoch: "bg-orange-100 text-orange-800",
    kritisch: "bg-red-100 text-red-800",
  };
  return colors[level];
}

export function labelsForSelections<T extends string>(
  selected: T[],
  options: CriticalityOption<T>[]
): string[] {
  const map = new Map(options.map((o) => [o.id, o.label]));
  return selected.map((id) => map.get(id) ?? id);
}

export function parseCriticalityArrays(company: Partial<Company>): {
  business_criticality_types: BusinessCriticalityType[];
  processed_data_types: ProcessedDataType[];
  infrastructure_types: InfrastructureType[];
} {
  return {
    business_criticality_types: Array.isArray(company.business_criticality_types)
      ? (company.business_criticality_types as BusinessCriticalityType[])
      : [],
    processed_data_types: Array.isArray(company.processed_data_types)
      ? (company.processed_data_types as ProcessedDataType[])
      : [],
    infrastructure_types: Array.isArray(company.infrastructure_types)
      ? (company.infrastructure_types as InfrastructureType[])
      : [],
  };
}

export function getCompanyCriticalityScores(company: Partial<Company>): CriticalityScores {
  const arrays = parseCriticalityArrays(company);
  if (
    company.criticality_score != null &&
    company.criticality_level &&
    company.criticality_level !== "unbekannt"
  ) {
    return {
      business: company.business_criticality_score ?? 0,
      data: company.data_criticality_score ?? 0,
      infrastructure: company.infrastructure_criticality_score ?? 0,
      total: company.criticality_score,
      level: company.criticality_level as CriticalityLevel,
    };
  }
  return calculateCriticalityScores(arrays);
}

export function formatCriticalityContextBlock(company: Partial<Company>): string {
  const arrays = parseCriticalityArrays(company);
  const scores = getCompanyCriticalityScores(company);

  if (scores.level === "unbekannt") {
    return "Kritikalitätsbewertung: Noch nicht durchgeführt";
  }

  const businessLabels = labelsForSelections(arrays.business_criticality_types, BUSINESS_CRITICALITY_OPTIONS);
  const dataLabels = labelsForSelections(arrays.processed_data_types, PROCESSED_DATA_OPTIONS);
  const infraLabels = labelsForSelections(arrays.infrastructure_types, INFRASTRUCTURE_OPTIONS);

  return [
    `Gesamtkritikalität: ${getCriticalityLevelLabel(scores.level)} (${scores.total} Punkte)`,
    `Geschäftskritikalität: ${scores.business} Punkte${businessLabels.length ? ` — ${businessLabels.join(", ")}` : ""}`,
    `Datenkritikalität: ${scores.data} Punkte${dataLabels.length ? ` — ${dataLabels.join(", ")}` : ""}`,
    `Infrastrukturkritikalität: ${scores.infrastructure} Punkte${infraLabels.length ? ` — ${infraLabels.join(", ")}` : ""}`,
  ].join("\n");
}

export function criticalityBoostForNis2Score(company: Partial<Company>): number {
  const scores = getCompanyCriticalityScores(company);
  if (scores.level === "kritisch") return 15;
  if (scores.level === "hoch") return 10;
  if (scores.level === "mittel") return 5;
  return 0;
}

export function hasHighCriticalityIndicators(company: Partial<Company>): boolean {
  const scores = getCompanyCriticalityScores(company);
  return scores.level === "hoch" || scores.level === "kritisch";
}
