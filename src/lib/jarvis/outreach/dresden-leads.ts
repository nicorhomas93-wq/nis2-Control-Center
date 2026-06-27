/**
 * Kurierter Lead-Pool: Dresden + Umland (~100 km).
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
    company_name: "Sächsische Mikroelektronik GmbH",
    city: "Dresden",
    industry: "Elektrotechnik",
    employee_count: 420,
    contact_role: "Leiter Informationssicherheit",
    hints: "Fertigung, hohe digitale Abhängigkeit, kein ISMS sichtbar",
  },
  {
    company_name: "Elbe Maschinenbau Dresden",
    city: "Dresden",
    industry: "Maschinenbau",
    employee_count: 185,
    hints: "Produktions-IT, keine Security-Seite",
  },
  {
    company_name: "SachsenNetz Energieversorgung",
    city: "Dresden",
    industry: "Energie / Versorgung",
    employee_count: 280,
    contact_role: "Compliance-Beauftragter",
  },
  {
    company_name: "Spedition Elbe Logistik",
    city: "Dresden",
    industry: "Logistik / Transport",
    employee_count: 145,
    hints: "Microsoft 365, Touren cloud",
  },
  {
    company_name: "Systemhaus Sachsen IT",
    city: "Dresden",
    industry: "IT / Systemhaus",
    employee_count: 92,
    hints: "MSP, Kunden fragen nach NIS2-Doku",
  },
  {
    company_name: "Klinikverbund Dresden-Ost",
    city: "Dresden",
    industry: "Gesundheitswesen",
    employee_count: 680,
    contact_role: "Leiter IT",
  },
  {
    company_name: "Elektronik Fertigung Chemnitz",
    city: "Chemnitz",
    industry: "Elektrotechnik",
    employee_count: 310,
    hints: "Automotive-Zulieferer, Lieferketten-NIS2",
  },
  {
    company_name: "Chemnitz Industrieprodukte AG",
    city: "Chemnitz",
    industry: "Industrie / Produktion",
    employee_count: 240,
  },
  {
    company_name: "Oberelbe Cloud Services",
    city: "Dresden",
    industry: "IT / Hosting",
    employee_count: 78,
    hints: "Hosting, kein ISO online",
  },
  {
    company_name: "Logistikzentrum Pirna",
    city: "Pirna",
    industry: "Logistik / Transport",
    employee_count: 115,
  },
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
