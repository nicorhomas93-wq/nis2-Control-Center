export type IcpIndustry =
  | "manufacturing"
  | "logistics"
  | "it_services"
  | "finance"
  | "healthcare"
  | "energy";

export type IcpRole = "geschaeftsfuehrer" | "it_leiter" | "compliance" | "ciso";

export type IcpTriggerSignal =
  | "it_infrastructure"
  | "data_processing"
  | "security_relevance"
  | "supply_chain"
  | "cloud_m365"
  | "kritis_proximity";

export interface IcpSegment {
  id: string;
  name: string;
  industries: IcpIndustry[];
  employeeMin: number;
  employeeMax: number;
  roles: IcpRole[];
  triggerSignals: IcpTriggerSignal[];
  priority: "high" | "medium";
  linkedinFilters: string[];
  painPoints: string[];
}

export const ICP_SEGMENTS: IcpSegment[] = [
  {
    id: "sme_manufacturing",
    name: "Produzierendes KMU",
    industries: ["manufacturing"],
    employeeMin: 20,
    employeeMax: 500,
    roles: ["geschaeftsfuehrer", "it_leiter"],
    triggerSignals: ["it_infrastructure", "security_relevance", "supply_chain", "kritis_proximity"],
    priority: "high",
    linkedinFilters: [
      "Branche: Fertigung / Maschinenbau",
      "Unternehmensgröße: 20–500",
      "Titel: Geschäftsführer, IT-Leiter, Leiter IT",
      "Standort: Deutschland",
    ],
    painPoints: [
      "OT/IT-Schnittstelle unklar",
      "Lieferanten-Audits fordern NIS2-Nachweise",
      "Keine Incident-Prozesse dokumentiert",
    ],
  },
  {
    id: "sme_logistics",
    name: "Logistik & Transport",
    industries: ["logistics"],
    employeeMin: 20,
    employeeMax: 500,
    roles: ["geschaeftsfuehrer", "it_leiter"],
    triggerSignals: ["it_infrastructure", "data_processing", "security_relevance"],
    priority: "high",
    linkedinFilters: [
      "Branche: Logistik / Transport / Spedition",
      "Unternehmensgröße: 20–500",
      "Titel: Geschäftsführer, IT-Leiter",
      "Standort: Deutschland",
    ],
    painPoints: [
      "Digitale Disposition und Tracking-Systeme",
      "Lieferketten-Sicherheit",
      "Meldepflichten unbekannt",
    ],
  },
  {
    id: "sme_it_services",
    name: "IT-Dienstleister & MSP",
    industries: ["it_services"],
    employeeMin: 20,
    employeeMax: 500,
    roles: ["geschaeftsfuehrer", "it_leiter", "ciso"],
    triggerSignals: ["data_processing", "security_relevance", "cloud_m365"],
    priority: "high",
    linkedinFilters: [
      "Branche: IT-Dienstleistungen / Software",
      "Unternehmensgröße: 20–500",
      "Titel: Geschäftsführer, IT-Leiter, CISO",
      "Standort: Deutschland",
    ],
    painPoints: [
      "NIS2 als ICT-Dienstleister betroffen",
      "Kunden fordern Compliance-Nachweise",
      "Skalierbare Dokumentation fehlt",
    ],
  },
  {
    id: "sme_finance",
    name: "Finanzdienstleister KMU",
    industries: ["finance"],
    employeeMin: 20,
    employeeMax: 500,
    roles: ["geschaeftsfuehrer", "compliance", "it_leiter"],
    triggerSignals: ["data_processing", "security_relevance"],
    priority: "medium",
    linkedinFilters: [
      "Branche: Finanzdienstleistungen / Versicherungsmakler",
      "Unternehmensgröße: 20–500",
      "Titel: Geschäftsführer, Compliance, IT-Leiter",
      "Standort: Deutschland",
    ],
    painPoints: [
      "Regulatorischer Druck",
      "Datenverarbeitung und Meldepflichten",
      "Audit-Vorbereitung zeitintensiv",
    ],
  },
];

export const ICP_INDUSTRY_LABELS: Record<IcpIndustry, string> = {
  manufacturing: "Produktion / Fertigung",
  logistics: "Logistik / Transport",
  it_services: "IT-Dienstleistungen",
  finance: "Finanzdienstleister",
  healthcare: "Gesundheit",
  energy: "Energie / Versorgung",
};

export const ICP_TRIGGER_LABELS: Record<IcpTriggerSignal, string> = {
  it_infrastructure: "IT-Infrastruktur im Kerngeschäft",
  data_processing: "Umfangreiche Datenverarbeitung",
  security_relevance: "Hohe Sicherheitsrelevanz",
  supply_chain: "Lieferkette / Zulieferer",
  cloud_m365: "Microsoft 365 / Cloud",
  kritis_proximity: "Nähe zu kritischer Infrastruktur",
};

export function filterIcpByIndustry(industry: IcpIndustry): IcpSegment[] {
  return ICP_SEGMENTS.filter((s) => s.industries.includes(industry));
}

export function filterIcpByEmployeeCount(count: number): IcpSegment[] {
  return ICP_SEGMENTS.filter((s) => count >= s.employeeMin && count <= s.employeeMax);
}

export function matchFunnelIndustryToIcp(
  funnelIndustry: string
): IcpIndustry | null {
  const map: Record<string, IcpIndustry> = {
    produktion: "manufacturing",
    handel: "logistics",
    dienstleistung: "it_services",
    it: "it_services",
    gesundheit: "healthcare",
    energie: "energy",
    sonstige: "manufacturing",
  };
  return map[funnelIndustry] ?? null;
}
