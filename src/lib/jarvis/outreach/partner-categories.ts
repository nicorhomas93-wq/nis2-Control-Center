export type PartnerLeadCategory =
  | "systemhaus_it_dienstleister"
  | "msp"
  | "cybersecurity_beratung"
  | "datenschutz_beratung"
  | "compliance_nis2_beratung"
  | "cloud_m365_beratung"
  | "backup_notfallmanagement"
  | "sonstiger_partner"
  | "nicht_priorisiert";

export const PARTNER_LEAD_CATEGORIES: PartnerLeadCategory[] = [
  "systemhaus_it_dienstleister",
  "msp",
  "cybersecurity_beratung",
  "datenschutz_beratung",
  "compliance_nis2_beratung",
  "cloud_m365_beratung",
  "backup_notfallmanagement",
  "sonstiger_partner",
  "nicht_priorisiert",
];

export const PARTNER_CATEGORY_LABELS: Record<PartnerLeadCategory, string> = {
  systemhaus_it_dienstleister: "Systemhaus / IT-Dienstleister",
  msp: "Managed Service Provider",
  cybersecurity_beratung: "Cybersecurity-Beratung",
  datenschutz_beratung: "Datenschutzberatung",
  compliance_nis2_beratung: "Compliance-/NIS2-Beratung",
  cloud_m365_beratung: "Cloud-/Microsoft-365-Beratung",
  backup_notfallmanagement: "Backup-/Notfallmanagement-Dienstleister",
  sonstiger_partner: "Sonstiger potenzieller Partner",
  nicht_priorisiert: "Nicht priorisiert",
};

interface CategoryRule {
  category: PartnerLeadCategory;
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "msp",
    keywords: ["msp", "managed service", "managed services", "it-service provider"],
  },
  {
    category: "systemhaus_it_dienstleister",
    keywords: [
      "systemhaus",
      "it-dienstleister",
      "it dienstleister",
      "it-support",
      "it support",
      "edv",
      "it-service",
      "it service",
      "ict",
    ],
  },
  {
    category: "cybersecurity_beratung",
    keywords: [
      "cybersecurity",
      "it-sicherheit",
      "informationssicherheit",
      "security beratung",
      "penetration",
      "soc ",
      "ciso",
      "siem",
    ],
  },
  {
    category: "datenschutz_beratung",
    keywords: ["datenschutz", "dsgvo", "datenschutzbeauftrag", "privacy"],
  },
  {
    category: "compliance_nis2_beratung",
    keywords: ["compliance", "nis2", "grc", "iso 27001", "audit beratung", "regulatorik"],
  },
  {
    category: "cloud_m365_beratung",
    keywords: [
      "microsoft 365",
      "m365",
      "cloud migration",
      "cloud-beratung",
      "azure",
      "office 365",
      "cloud dienst",
    ],
  },
  {
    category: "backup_notfallmanagement",
    keywords: [
      "backup",
      "wiederherstellung",
      "disaster recovery",
      "notfallmanagement",
      "business continuity",
      "bcm",
    ],
  },
];

export function classifyPartnerCategory(text: string): PartnerLeadCategory {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  if (
    lower.includes("beratung") ||
    lower.includes("consulting") ||
    lower.includes("partner") ||
    lower.includes("digitalisierung")
  ) {
    return "sonstiger_partner";
  }
  return "nicht_priorisiert";
}
