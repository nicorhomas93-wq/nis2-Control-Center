/**
 * Kurierter Lead-Pool: Dresden + Umland (~100 km) — B2B-Partner-Fokus.
 */

import type { QualifiedLeadInput } from "@/lib/jarvis/outreach/qualified-lead-types";

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
  },
  {
    company_name: "Oberelbe Cloud Services",
    city: "Dresden",
    industry: "IT / Hosting",
    employee_count: 78,
    hints: "Cloud-Migration, Microsoft 365, Backup-Konzepte",
  },
  {
    company_name: "Sachsen Security Consulting",
    city: "Dresden",
    industry: "IT-Sicherheitsberatung",
    employee_count: 24,
    contact_role: "Inhaber",
    hints: "NIS2-Beratung, ISO 27001, Phishing-Simulationen",
  },
  {
    company_name: "Datenschutz Partner Elbe",
    city: "Dresden",
    industry: "Datenschutzberatung",
    employee_count: 14,
    hints: "externe ISB, DSGVO, KMU-Mandate",
  },
  {
    company_name: "M365 Partner Dresden",
    city: "Dresden",
    industry: "Microsoft 365 Beratung",
    employee_count: 32,
    hints: "Microsoft 365 Betreuung, Cloud-Migration",
  },
  {
    company_name: "IT-Support Mittelstand Sachsen",
    city: "Dresden",
    industry: "Managed Service Provider",
    employee_count: 48,
    hints: "IT-Support, Firewall, Endpoint Security",
  },
  {
    company_name: "Backup & Recovery Sachsen",
    city: "Pirna",
    industry: "Backup & Wiederherstellung",
    employee_count: 28,
    contact_role: "Leiter Services",
    hints: "Notfallmanagement, Backup-Konzepte",
  },
  {
    company_name: "Digitalisierung KMU Chemnitz",
    city: "Chemnitz",
    industry: "Digitalisierung / KMU",
    employee_count: 36,
    hints: "Digitalisierungspartner, IT-Support für KMU",
  },
  {
    company_name: "Compliance Beratung Erzgebirge",
    city: "Freiberg",
    industry: "Compliance-Beratung",
    employee_count: 16,
    hints: "NIS2, ISO 27001, Awareness-Schulungen",
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
