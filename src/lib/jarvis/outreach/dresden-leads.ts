/**
 * Kurierter Lead-Pool: Dresden + Umland (~100 km) — B2B-Partner-Fokus.
 */

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
    contact_email: `info@${slug}.de`,
    contact_phone: phone,
    has_contact_form: true,
    linkedin_url: `https://www.linkedin.com/company/${slug}`,
  };
}

export type DresdenRegionLead = QualifiedLeadInput;

export const DRESDEN_REGION_CITIES = new Set(
  [
    "Dresden",
    "Radebeul",
    "Coswig",
    "Meißen",
    "Meissen",
    "Pirna",
    "Freital",
    "Heidenau",
    "Radeberg",
    "Dohna",
    "Bautzen",
    "Görlitz",
    "Goerlitz",
    "Chemnitz",
    "Freiberg",
    "Döbeln",
    "Doebeln",
    "Zittau",
    "Hoyerswerda",
    "Kamenz",
    "Großenhain",
    "Grossenhain",
    "Wilsdruff",
    "Moritzburg",
  ].map((c) => c.toLowerCase())
);

export const DRESDEN_LEAD_POOL: QualifiedLeadInput[] = [
  {
    company_name: "Systemhaus Sachsen IT",
    city: "Dresden",
    industry: "IT / Systemhaus",
    employee_count: 92,
    contact_role: "Geschäftsführer",
    hints: "MSP, Managed Services, Kunden fragen nach NIS2-Doku",
    ...partnerContact("systemhaus-sachsen-it", "+49 351 1234567"),
  },
  {
    company_name: "Oberelbe Cloud Services",
    city: "Dresden",
    industry: "IT / Hosting",
    employee_count: 78,
    hints: "Cloud-Migration, Microsoft 365, Backup-Konzepte",
    ...partnerContact("oberelbe-cloud", "+49 351 2345678"),
  },
  {
    company_name: "Sachsen Security Consulting",
    city: "Dresden",
    industry: "IT-Sicherheitsberatung",
    employee_count: 24,
    contact_role: "Inhaber",
    hints: "NIS2-Beratung, ISO 27001, Phishing-Simulationen",
    ...partnerContact("sachsen-security", "+49 351 3456789"),
  },
  {
    company_name: "Datenschutz Partner Elbe",
    city: "Dresden",
    industry: "Datenschutzberatung",
    employee_count: 14,
    hints: "externe ISB, DSGVO, KMU-Mandate",
    contact_email: "kontakt@datenschutz-elbe.de",
    contact_phone: "+49 351 4567890",
    has_contact_form: true,
    website: "https://www.datenschutz-elbe.de",
  },
  {
    company_name: "M365 Partner Dresden",
    city: "Dresden",
    industry: "Microsoft 365 Beratung",
    employee_count: 32,
    hints: "Microsoft 365 Betreuung, Cloud-Migration",
    ...partnerContact("m365-partner-dresden", "+49 351 5678901"),
  },
  {
    company_name: "IT-Support Mittelstand Sachsen",
    city: "Dresden",
    industry: "Managed Service Provider",
    employee_count: 48,
    hints: "IT-Support, Firewall, Endpoint Security",
    ...partnerContact("it-support-mittelstand-sachsen", "+49 351 6789012"),
  },
  {
    company_name: "Backup & Recovery Sachsen",
    city: "Pirna",
    industry: "Backup & Wiederherstellung",
    employee_count: 28,
    contact_role: "Leiter Services",
    hints: "Notfallmanagement, Backup-Konzepte",
    ...partnerContact("backup-recovery-sachsen", "+49 3501 7890123"),
  },
  {
    company_name: "Digitalisierung KMU Chemnitz",
    city: "Chemnitz",
    industry: "Digitalisierung / KMU",
    employee_count: 36,
    hints: "Digitalisierungspartner, IT-Support für KMU",
    ...partnerContact("digitalisierung-kmu-chemnitz", "+49 371 8901234"),
  },
  {
    company_name: "Compliance Beratung Erzgebirge",
    city: "Freiberg",
    industry: "Compliance-Beratung",
    employee_count: 16,
    hints: "NIS2, ISO 27001, Awareness-Schulungen",
    contact_email: "office@compliance-erzgebirge.de",
    contact_phone: "+49 3731 9012345",
    has_contact_form: true,
    website: "https://www.compliance-erzgebirge.de",
  },
  // ─── DEPRIORISIERT ───
  {
    company_name: "Klinikverbund Dresden-Ost",
    city: "Dresden",
    industry: "Gesundheitswesen",
    employee_count: 680,
    contact_role: "Leiter IT",
  },
  {
    company_name: "Landratsamt Beispiel",
    city: "Pirna",
    industry: "Öffentlicher Sektor",
    employee_count: 310,
    hints: "Behörde, Ausschreibungszwang",
  },
  // ─── NIEDRIG / AUSSERHALB ───
  {
    company_name: "Bäckerei Schmidt Dresden",
    city: "Dresden",
    industry: "Einzelhandel",
    employee_count: 12,
  },
  {
    company_name: "Weber Bau GmbH",
    city: "Dresden",
    industry: "Bau",
    employee_count: 45,
  },
  {
    company_name: "Online Shop Mode Dresden",
    city: "Dresden",
    industry: "Einzelhandel",
    employee_count: 8,
    hints: "reiner Online-Shop",
  },
  {
    company_name: "Leipzig Handels AG",
    city: "Leipzig",
    industry: "Logistik / Transport",
    employee_count: 200,
    hints: "außerhalb 100 km Radius",
  },
];
