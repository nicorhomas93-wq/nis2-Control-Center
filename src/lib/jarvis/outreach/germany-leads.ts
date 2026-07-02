import type { QualifiedLeadInput } from "@/lib/jarvis/outreach/qualified-lead-types";

/**
 * Kurierter Deutschland-Pool — B2B-Partner (IT-Dienstleister, MSP, Berater).
 * Später durch North Data / Apollo / Handelsregister-API ersetzbar.
 */
export const GERMANY_LEAD_POOL: QualifiedLeadInput[] = [
  // ─── HIGH PRIORITY — Partner ───
  {
    company_name: "Systemhaus Mittelstand NRW",
    city: "Düsseldorf",
    industry: "IT / Systemhaus",
    employee_count: 95,
    contact_role: "Geschäftsführer",
    hints: "MSP, Managed Services, KMU-Kunden fragen NIS2",
  },
  {
    company_name: "Netzwerk IT Systemhaus",
    city: "Münster",
    industry: "IT / Systemhaus",
    employee_count: 62,
    hints: "White-Label, Microsoft 365 Betreuung",
  },
  {
    company_name: "IT Solutions Leipzig",
    city: "Leipzig",
    industry: "IT / Software",
    employee_count: 88,
    hints: "B2B-SaaS, IT-Sicherheit, ISO 27001 Beratung",
  },
  {
    company_name: "CloudHost Deutschland",
    city: "Berlin",
    industry: "IT / Hosting",
    employee_count: 145,
    hints: "Cloud-Migration, Backup-Konzepte, MSP",
  },
  {
    company_name: "Rechenzentrum Ost",
    city: "Berlin",
    industry: "IT / Hosting",
    employee_count: 72,
    hints: "Managed Services, Firewall, Endpoint Security",
  },
  {
    company_name: "CyberGuard Consulting",
    city: "München",
    industry: "IT-Sicherheitsberatung",
    employee_count: 28,
    contact_role: "Partner",
    hints: "NIS2-Beratung, Phishing-Simulationen",
  },
  {
    company_name: "Datenschutz & Compliance West",
    city: "Köln",
    industry: "Datenschutzberatung",
    employee_count: 18,
    hints: "DSGVO, externe ISB, KMU-Mandate",
  },
  {
    company_name: "GRC Solutions Mittelstand",
    city: "Frankfurt",
    industry: "Compliance-Beratung",
    employee_count: 22,
    hints: "ISO 27001, NIS2, Awareness-Schulungen",
  },
  {
    company_name: "M365 Cloud Partner Süd",
    city: "Stuttgart",
    industry: "Microsoft 365 Beratung",
    employee_count: 35,
    hints: "Cloud-Migration, Microsoft 365 Betreuung",
  },
  {
    company_name: "BackupPro Notfallmanagement",
    city: "Hamburg",
    industry: "Backup & Wiederherstellung",
    employee_count: 40,
    contact_role: "Leiter Services",
    hints: "Notfallmanagement, Backup-Konzepte",
  },
  {
    company_name: "SecureCloud MSP",
    city: "Hannover",
    industry: "Managed Service Provider",
    employee_count: 55,
    hints: "IT-Support, Managed Services, Firewall",
  },
  {
    company_name: "Digitalisierung Partner Rhein",
    city: "Mannheim",
    industry: "Digitalisierung / KMU",
    employee_count: 48,
    hints: "Digitalisierungspartner, IT-Support für KMU",
  },
  {
    company_name: "Systemhaus Sachsen IT",
    city: "Dresden",
    industry: "IT / Systemhaus",
    employee_count: 92,
    hints: "MSP, Kunden fragen nach NIS2-Doku",
  },
  {
    company_name: "Oberelbe Cloud Services",
    city: "Dresden",
    industry: "IT / Hosting",
    employee_count: 78,
    hints: "Cloud, Backup, Managed Services",
  },
  {
    company_name: "IT-Security Partner Süd",
    city: "Augsburg",
    industry: "Cybersecurity-Beratung",
    employee_count: 32,
    hints: "Endpoint Security, Penetrationstests",
  },
  // ─── DEPRIORISIERT — Ausschluss-Zielgruppen (zum Testen) ───
  {
    company_name: "Klinikverbund Nord",
    city: "Hannover",
    industry: "Gesundheitswesen",
    employee_count: 890,
    contact_role: "CIO",
  },
  {
    company_name: "Klinikum Rhein-Main",
    city: "Wiesbaden",
    industry: "Gesundheitswesen",
    employee_count: 650,
  },
  {
    company_name: "Stadtverwaltung Beispielstadt",
    city: "Bremen",
    industry: "Öffentlicher Sektor",
    employee_count: 420,
    hints: "Kommune, Ausschreibungszwang",
  },
  {
    company_name: "ChemiePark Service",
    city: "Ludwigshafen",
    industry: "Pharma / Chemie",
    employee_count: 450,
    hints: "Konzernstruktur, komplexer Einkauf",
  },
  // ─── NIEDRIG — kein IT-/Partner-Bezug ───
  {
    company_name: "Mode Online Shop Berlin",
    city: "Berlin",
    industry: "Einzelhandel",
    employee_count: 8,
    hints: "reiner Online-Shop",
  },
  {
    company_name: "Bäckerei Müller",
    city: "Stuttgart",
    industry: "Einzelhandel",
    employee_count: 15,
  },
  {
    company_name: "Bau Schmidt GmbH",
    city: "München",
    industry: "Bau",
    employee_count: 35,
  },
];
