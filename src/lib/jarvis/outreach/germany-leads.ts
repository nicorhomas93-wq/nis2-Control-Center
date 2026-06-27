import type { QualifiedLeadInput } from "@/lib/jarvis/outreach/qualified-lead-types";

/**
 * Kurierter Deutschland-Pool — bundesweit, qualitätsgefiltert.
 * Später durch North Data / Apollo / Handelsregister-API ersetzbar.
 */
export const GERMANY_LEAD_POOL: QualifiedLeadInput[] = [
  // ─── HIGH PRIORITY — qualifiziert ───
  { company_name: "RheinMain Logistik AG", city: "Frankfurt", industry: "Logistik / Transport", employee_count: 320, hints: "ERP cloud, keine Security-Seite" },
  { company_name: "NordWerk Energie Netz", city: "Hamburg", industry: "Energie / Versorgung", employee_count: 410, contact_role: "Leiter IT" },
  { company_name: "BayernChem Produktion", city: "München", industry: "Pharma / Chemie", employee_count: 285, hints: "GMP, Lieferketten-Audit" },
  { company_name: "Stahlwerk Ruhr Industrie", city: "Essen", industry: "Industrie / Produktion", employee_count: 520, hints: "OT/IT, KRITIS-nah" },
  { company_name: "CloudHost Deutschland", city: "Berlin", industry: "IT / Hosting", employee_count: 145, hints: "Rechenzentrum, kein ISO online" },
  { company_name: "Systemhaus Mittelstand NRW", city: "Düsseldorf", industry: "IT / Systemhaus", employee_count: 95, hints: "MSP, Kunden fragen NIS2" },
  { company_name: "Klinikverbund Nord", city: "Hannover", industry: "Gesundheitswesen", employee_count: 890, contact_role: "CIO" },
  { company_name: "Spedition Elbe Express", city: "Dresden", industry: "Logistik / Transport", employee_count: 165, hints: "Microsoft 365, Touren cloud" },
  { company_name: "Sächsische Mikroelektronik", city: "Dresden", industry: "Elektrotechnik", employee_count: 380, hints: "Halbleiter, digitale Fertigung" },
  { company_name: "Automotive Zulieferer Süd", city: "Stuttgart", industry: "Industrie / Produktion", employee_count: 240, hints: "OEM-Audit-Anforderungen" },
  { company_name: "PharmaLab West", city: "Köln", industry: "Pharma / Chemie", employee_count: 175, contact_role: "QA-Leiter" },
  { company_name: "EnergieNetz Südwest", city: "Karlsruhe", industry: "Energie / Versorgung", employee_count: 310 },
  { company_name: "Maschinenbau Precision", city: "Augsburg", industry: "Maschinenbau", employee_count: 130, hints: "CNC, ERP, keine ISMS-Seite" },
  { company_name: "IT Solutions Leipzig", city: "Leipzig", industry: "IT / Software", employee_count: 88, hints: "SaaS, B2B-Kunden" },
  { company_name: "Medizintechnik Plus", city: "Freiburg", industry: "Gesundheitswesen", employee_count: 120, hints: "MDR + NIS2 Schnittstelle" },
  { company_name: "ChemiePark Service", city: "Ludwigshafen", industry: "Pharma / Chemie", employee_count: 450, hints: "Konzernstruktur, mehrere Standorte" },
  { company_name: "Transport Alliance GmbH", city: "Bremen", industry: "Logistik / Transport", employee_count: 195 },
  { company_name: "Elektrotechnik Rhein", city: "Mannheim", industry: "Elektrotechnik", employee_count: 155, hints: "Automatisierung, SCADA" },
  { company_name: "Produktion Tech Nord", city: "Hamburg", industry: "Industrie / Produktion", employee_count: 210 },
  { company_name: "Rechenzentrum Ost", city: "Berlin", industry: "IT / Hosting", employee_count: 72, hints: "Hosting, kein ISO 27001 sichtbar" },
  { company_name: "Ingenieurbüro Technik Süd", city: "Nürnberg", industry: "Technische Dienstleister", employee_count: 85, hints: "Planung kritischer Anlagen" },
  { company_name: "Klinikum Rhein-Main", city: "Wiesbaden", industry: "Gesundheitswesen", employee_count: 650 },
  { company_name: "Industriewerk Sachsen", city: "Chemnitz", industry: "Industrie / Produktion", employee_count: 275 },
  { company_name: "Netzwerk IT Systemhaus", city: "Münster", industry: "IT / Systemhaus", employee_count: 62, hints: "White-Label Interesse" },
  // ─── LOW / Ausschluss ───
  { company_name: "Mode Online Shop Berlin", city: "Berlin", industry: "Einzelhandel", employee_count: 8, hints: "reiner Online-Shop" },
  { company_name: "Bau Schmidt GmbH", city: "München", industry: "Bau", employee_count: 35 },
  { company_name: "Freelancer IT Consulting", city: "Hamburg", industry: "Dienstleistung", employee_count: 1 },
  { company_name: "Bäckerei Müller", city: "Stuttgart", industry: "Einzelhandel", employee_count: 15 },
  { company_name: "Autohaus Klein", city: "Köln", industry: "Einzelhandel", employee_count: 28 },
  { company_name: "Lokal Service Dresden", city: "Dresden", industry: "Dienstleistung", employee_count: 12, hints: "lokaler Mini-Betrieb" },
];
