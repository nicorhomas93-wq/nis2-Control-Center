export const OUTREACH_DAILY_LIMIT = Number(process.env.OUTREACH_DAILY_LIMIT ?? "15") || 15;

export const B2B_OUTREACH_STATUS_LABELS: Record<string, string> = {
  new: "Neu",
  ready: "Bereit (Copy)",
  contacted: "Kontaktiert",
  replied: "Antwort",
  customer: "Kunde",
  skipped: "Übersprungen",
};

export const NIS2_LIKELIHOOD_LABELS: Record<string, string> = {
  yes: "Wahrscheinlich betroffen",
  no: "Eher nicht betroffen",
  uncertain: "Unklar",
};

export const IT_MATURITY_LABELS: Record<string, string> = {
  low: "Gering",
  medium: "Mittel",
  high: "Hoch",
  unknown: "Unbekannt",
};

export interface SeedLeadInput {
  company_name: string;
  industry: string;
  website?: string;
  employee_count?: string;
  contact_role?: string;
}

/** Kuratierte Mittelstands-Leads — manuell erweiterbar / später durch API ersetzen */
export const SEED_LEADS: SeedLeadInput[] = [
  {
    company_name: "Müller Maschinenbau GmbH",
    industry: "Maschinenbau",
    website: "https://www.mueller-maschinenbau.de",
    employee_count: "120",
    contact_role: "Geschäftsführer",
  },
  {
    company_name: "Autohaus Schneider",
    industry: "Automobilhandel",
    employee_count: "45",
    contact_role: "Geschäftsführer",
  },
  {
    company_name: "Pflegezentrum Dresden",
    industry: "Gesundheitswesen",
    employee_count: "85",
    contact_role: "Einrichtungsleitung",
  },
  {
    company_name: "Bauunternehmen Weber",
    industry: "Bauwesen",
    employee_count: "200",
    contact_role: "Geschäftsführer",
  },
  {
    company_name: "Logistik Nord GmbH",
    industry: "Logistik",
    employee_count: "150",
    contact_role: "IT-Leiter",
  },
  {
    company_name: "TechSupport Mittelstand",
    industry: "IT-Systemhaus",
    employee_count: "35",
    contact_role: "Geschäftsführer",
  },
  {
    company_name: "ChemieProdukt AG",
    industry: "Chemie",
    employee_count: "320",
    contact_role: "Compliance-Beauftragter",
  },
  {
    company_name: "EnergieWerk Süd",
    industry: "Energie",
    employee_count: "180",
    contact_role: "Leiter IT",
  },
  {
    company_name: "FoodProcess GmbH",
    industry: "Lebensmittel",
    employee_count: "95",
    contact_role: "Qualitätsmanagement",
  },
  {
    company_name: "PrintMedia Solutions",
    industry: "Medien/Druck",
    employee_count: "60",
    contact_role: "Geschäftsführer",
  },
];
