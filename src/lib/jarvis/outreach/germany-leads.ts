import type { QualifiedLeadInput } from "@/lib/jarvis/outreach/qualified-lead-types";

function partnerContact(
  slug: string,
  phone: string
): Pick<
  QualifiedLeadInput,
  "website" | "contact_email" | "contact_phone" | "has_contact_form" | "linkedin_url"
> {
  return {
    website: `https://www.${slug}.de`,
    contact_email: `kontakt@${slug}.de`,
    contact_phone: phone,
    has_contact_form: true,
    linkedin_url: `https://www.linkedin.com/company/${slug}`,
  };
}

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
    ...partnerContact("systemhaus-mittelstand-nrw", "+49 211 1234567"),
  },
  {
    company_name: "Netzwerk IT Systemhaus",
    city: "Münster",
    industry: "IT / Systemhaus",
    employee_count: 62,
    hints: "White-Label, Microsoft 365 Betreuung",
    ...partnerContact("netzwerk-it-systemhaus", "+49 251 2345678"),
  },
  {
    company_name: "IT Solutions Leipzig",
    city: "Leipzig",
    industry: "IT / Software",
    employee_count: 88,
    hints: "B2B-SaaS, IT-Sicherheit, ISO 27001 Beratung",
    ...partnerContact("it-solutions-leipzig", "+49 341 3456789"),
  },
  {
    company_name: "CloudHost Deutschland",
    city: "Berlin",
    industry: "IT / Hosting",
    employee_count: 145,
    hints: "Cloud-Migration, Backup-Konzepte, MSP",
    ...partnerContact("cloudhost-deutschland", "+49 30 4567890"),
  },
  {
    company_name: "Rechenzentrum Ost",
    city: "Berlin",
    industry: "IT / Hosting",
    employee_count: 72,
    hints: "Managed Services, Firewall, Endpoint Security",
    ...partnerContact("rechenzentrum-ost", "+49 30 5678901"),
  },
  {
    company_name: "CyberGuard Consulting",
    city: "München",
    industry: "IT-Sicherheitsberatung",
    employee_count: 28,
    contact_role: "Partner",
    hints: "NIS2-Beratung, Phishing-Simulationen",
    ...partnerContact("cyberguard-consulting", "+49 89 6789012"),
  },
  {
    company_name: "Datenschutz & Compliance West",
    city: "Köln",
    industry: "Datenschutzberatung",
    employee_count: 18,
    hints: "DSGVO, externe ISB, KMU-Mandate",
    ...partnerContact("datenschutz-compliance-west", "+49 221 7890123"),
  },
  {
    company_name: "GRC Solutions Mittelstand",
    city: "Frankfurt",
    industry: "Compliance-Beratung",
    employee_count: 22,
    hints: "ISO 27001, NIS2, Awareness-Schulungen",
    ...partnerContact("grc-solutions-mittelstand", "+49 69 8901234"),
  },
  {
    company_name: "M365 Cloud Partner Süd",
    city: "Stuttgart",
    industry: "Microsoft 365 Beratung",
    employee_count: 35,
    hints: "Cloud-Migration, Microsoft 365 Betreuung",
    ...partnerContact("m365-cloud-partner-sued", "+49 711 9012345"),
  },
  {
    company_name: "BackupPro Notfallmanagement",
    city: "Hamburg",
    industry: "Backup & Wiederherstellung",
    employee_count: 40,
    contact_role: "Leiter Services",
    hints: "Notfallmanagement, Backup-Konzepte",
    ...partnerContact("backuppro-notfall", "+49 40 0123456"),
  },
  {
    company_name: "SecureCloud MSP",
    city: "Hannover",
    industry: "Managed Service Provider",
    employee_count: 55,
    hints: "IT-Support, Managed Services, Firewall",
    ...partnerContact("securecloud-msp", "+49 511 1234500"),
  },
  {
    company_name: "Digitalisierung Partner Rhein",
    city: "Mannheim",
    industry: "Digitalisierung / KMU",
    employee_count: 48,
    hints: "Digitalisierungspartner, IT-Support für KMU",
    ...partnerContact("digitalisierung-partner-rhein", "+49 621 2345600"),
  },
  {
    company_name: "Systemhaus Sachsen IT",
    city: "Dresden",
    industry: "IT / Systemhaus",
    employee_count: 92,
    hints: "MSP, Kunden fragen nach NIS2-Doku",
    ...partnerContact("systemhaus-sachsen-it", "+49 351 3456700"),
  },
  {
    company_name: "Oberelbe Cloud Services",
    city: "Dresden",
    industry: "IT / Hosting",
    employee_count: 78,
    hints: "Cloud, Backup, Managed Services",
    ...partnerContact("oberelbe-cloud", "+49 351 4567800"),
  },
  {
    company_name: "IT-Security Partner Süd",
    city: "Augsburg",
    industry: "Cybersecurity-Beratung",
    employee_count: 32,
    hints: "Endpoint Security, Penetrationstests",
    ...partnerContact("it-security-partner-sued", "+49 821 5678900"),
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
