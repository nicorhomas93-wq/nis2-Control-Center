/** @deprecated Nutze OUTREACH_DAILY_SEND_LIMIT — Fallback für bestehende Env-Variablen */
export const OUTREACH_DAILY_LIMIT = Number(process.env.OUTREACH_DAILY_LIMIT ?? "15") || 15;

/** Max. als kontaktiert markierte Nachrichten pro Tag */
export const OUTREACH_DAILY_SEND_LIMIT =
  Number(
    process.env.OUTREACH_DAILY_SEND_LIMIT ??
      process.env.OUTREACH_DAILY_LIMIT ??
      "15"
  ) || 15;

/** Partner-Score-Schwellen (0–100) */
export const PARTNER_PRIORITY_SCORE = 80;
export const PARTNER_QUALIFIED_SCORE = 60;
export const PARTNER_REVIEW_SCORE = 40;

/** Lead Finder: Mindest-Qualität für Anzeige (0–100+) */
export const LEAD_FINDER_MIN_SCORE = 70;

export const PARTNER_POTENTIAL_LABELS: Record<string, string> = {
  white_label: "White-Label-Partner",
  reseller: "Reseller",
  end_customer: "Endkunde",
};

export const OUTREACH_PRIORITY_LABELS: Record<string, string> = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

/** Legacy 0–10 UI-Kompatibilität (partner_score / 10) */
export const OUTREACH_PRIORITY_SCORE = 8;
export const OUTREACH_MIN_VISIBLE_SCORE = 6;

/** Soft-Limit Analyse pro Batch (kein hartes Tageslimit) */
export const OUTREACH_BATCH_ANALYSIS_LIMIT = 200;

export const B2B_OUTREACH_STATUS_LABELS: Record<string, string> = {
  new: "Neu",
  ready: "Bereit",
  contacted: "Kontaktiert",
  replied: "Antwort",
  customer: "Kunde",
  skipped: "Übersprungen",
  review_later: "Später prüfen",
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
  contact_email?: string;
  contact_phone?: string;
  has_contact_form?: boolean;
}

/** Kuratierte Partner-Leads — IT-Dienstleister, MSP, Berater */
export const SEED_LEADS: SeedLeadInput[] = [
  {
    company_name: "NordIT Systemhaus GmbH",
    industry: "IT-Systemhaus",
    website: "https://www.nordit-systemhaus.de",
    employee_count: "45",
    contact_role: "Geschäftsführer",
    contact_email: "kontakt@nordit-systemhaus.de",
    contact_phone: "+49 201 1234567",
    has_contact_form: true,
  },
  {
    company_name: "SecureCloud MSP",
    industry: "Managed Service Provider",
    employee_count: "28",
    contact_role: "Geschäftsführer",
    contact_email: "info@securecloud-msp.de",
    contact_phone: "+49 511 2345678",
    has_contact_form: true,
  },
  {
    company_name: "Datenschutz & Compliance Beratung Schmidt",
    industry: "Datenschutzberatung",
    employee_count: "12",
    contact_role: "Inhaber",
    contact_email: "office@ds-compliance-schmidt.de",
    has_contact_form: true,
  },
  {
    company_name: "CyberGuard Consulting",
    industry: "IT-Sicherheitsberatung",
    employee_count: "18",
    contact_role: "Partner",
    contact_email: "kontakt@cyberguard-consulting.de",
    contact_phone: "+49 89 3456789",
    has_contact_form: true,
  },
  {
    company_name: "M365 Cloud Partner Dresden",
    industry: "Microsoft 365 Beratung",
    employee_count: "22",
    contact_role: "Geschäftsführer",
    contact_email: "hello@m365-partner-dresden.de",
    contact_phone: "+49 351 4567890",
    has_contact_form: true,
  },
  {
    company_name: "BackupPro Notfallmanagement",
    industry: "Backup & Wiederherstellung",
    employee_count: "35",
    contact_role: "Leiter Services",
    contact_email: "service@backuppro.de",
    contact_phone: "+49 40 5678901",
    has_contact_form: true,
  },
  {
    company_name: "GRC Solutions Mittelstand",
    industry: "Compliance-Beratung",
    employee_count: "15",
    contact_role: "Senior Consultant",
    contact_email: "info@grc-solutions.de",
    has_contact_form: true,
  },
  {
    company_name: "IT-Security Partner Süd",
    industry: "Cybersecurity-Beratung",
    employee_count: "40",
    contact_role: "Geschäftsführer",
    contact_email: "partner@it-security-sued.de",
    contact_phone: "+49 821 6789012",
    has_contact_form: true,
  },
];
