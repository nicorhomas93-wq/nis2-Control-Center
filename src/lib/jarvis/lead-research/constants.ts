export const LEAD_RESEARCH_SYSTEM_PROMPT = `Jarvis Lead Research für TKND: Echte geschäftliche Bedarfssignale erkennen — nicht NIS2-News.

NIS2-Erwähnung allein ist KEIN Lead (max. 20 Punkte). Medien, Ratgeber und allgemeine Artikel = Score 0.

Leads nur bei: Stellen (ISB, Security, ISMS, DORA), Ausschreibungen, Unternehmensprojekten oder Partnern (Systemhaus/MSP/Berater).

Systemhäuser mit NIS2-Rollen = Partner, nicht Endkunde. Gute Leads ab Score 60. Qualität vor Menge.`;

export type ResearchSignalType = "tender" | "job" | "announcement" | "size_inference";

export type IndustryPriority = "A" | "B" | "C";

export const RESEARCH_SIGNAL_TYPE_LABELS: Record<ResearchSignalType, string> = {
  tender: "Ausschreibung",
  job: "Stellenanzeige",
  announcement: "Unternehmensmeldung",
  size_inference: "Größe / NIS2-Wahrscheinlichkeit",
};

export const RESEARCH_SIGNAL_STATUS_LABELS: Record<string, string> = {
  new: "Neu",
  reviewed: "Geprüft",
  converted: "Als Lead übernommen",
  dismissed: "Verworfen",
};

export const TENDER_SOURCES_AUTOMATED = ["oeffentlichevergabe.de", "bund.de"] as const;

export const TENDER_SOURCES = [
  "oeffentlichevergabe.de",
  "bund.de",
  "evergabe.de",
  "Vergabe24",
  "DTAD",
  "Subreport",
] as const;

export const JOB_SOURCES_AUTOMATED = ["arbeitsagentur.de", "Stepstone"] as const;

export const JOB_SOURCES = ["Stepstone", "Indeed", "LinkedIn Jobs", "Xing Jobs"] as const;

export const ANNOUNCEMENT_SOURCES = ["LinkedIn", "Unternehmenswebseite", "Karriereseite"] as const;

/** Google News deaktiviert — liefert zu viele Ratgeber/News ohne Organisations-Bedarf */
export const ANNOUNCEMENT_SOURCES_AUTOMATED = [] as const;

export const SCRAPER_RSS_PLATFORMS = [
  "evergabe.de",
  "Vergabe24",
  "DTAD",
  "Subreport",
] as const;

export const TENDER_KEYWORDS = [
  "NIS2 Umsetzung",
  "NIS2",
  "ISMS Aufbau",
  "ISO 27001 Einführung",
  "Informationssicherheitsmanagement",
  "BSI IT-Grundschutz",
  "Risikoanalyse Informationssicherheit",
  "Lieferantensicherheitsbewertung",
  "Security Awareness",
  "Incident Response Konzept",
  "Notfallmanagement",
  "BCM",
  "Audit-Vorbereitung Informationssicherheit",
  "Cybersecurity",
  "DORA",
] as const;

export const JOB_KEYWORDS = [
  "Informationssicherheitsbeauftragter",
  "ISB",
  "IT Security Manager",
  "Cyber Security Manager",
  "Compliance Manager",
  "ISO 27001 Manager",
  "ISMS Manager",
  "CISO",
  "IT-Risikomanager",
  "Business Continuity Manager",
  "OT Security",
  "DORA",
  "IT Asset Management",
  "IT-Governance",
  "Security Officer",
  "NIS2",
  "ISO 27001",
] as const;

export const ANNOUNCEMENT_KEYWORDS = [
  "wir führen ein",
  "wir bauen auf",
  "wir bereiten uns vor",
  "wir suchen Unterstützung",
  "wir stellen ein",
  "wir suchen",
  "ISO 27001",
  "ISMS",
  "NIS2",
] as const;

export const INDUSTRY_PRIORITY_A = [
  "rechenzentrum",
  "energie",
  "stadtwerk",
  "klinik",
  "krankenhaus",
  "logistik",
  "automobil",
  "produktion",
] as const;

export const INDUSTRY_PRIORITY_B = [
  "maschinenbau",
  "zulieferer",
  "lebensmittel",
  "chemie",
  "wasser",
  "versorgung",
  "transport",
  "finanz",
  "versicherung",
] as const;

export const INDUSTRY_PRIORITY_C = [
  "gesundheit",
  "forschung",
  "chemie",
  "wasser",
  "entsorgung",
  "beratung",
  "consulting",
] as const;

export const RESEARCH_SCORE_LABELS: Record<number, string> = {
  100: "Konkrete NIS2-Ausschreibung",
  95: "Stelle mit direkter NIS2-Compliance-Verantwortung",
  90: "ISMS-/ISO27001-Ausschreibung oder ISB/NIS2+DORA gesucht",
  80: "Security-/Compliance-Stelle mit NIS2/ISO/ISMS-Bezug",
  70: "Security-Ausbau oder Partner-Systemhaus mit NIS2-Rolle",
  60: "NIS2-Branche + Security-Stelle oder Partner mit Angebot",
  50: "Partnerpotenzial ohne klaren Anknüpfungspunkt (nicht übernehmen)",
  20: "Nur NIS2-Erwähnung ohne Bedarfssignal",
  0: "Nachrichtenportal / kein Lead",
};

export const LEAD_PRIORITY_LABELS: Record<string, string> = {
  A: "Akuter Bedarf wahrscheinlich",
  B: "Hoher Bedarf wahrscheinlich",
  C: "Partnerpotenzial",
  D: "Beobachten",
  keine: "Kein Lead",
};

export { LEAD_TYPE_LABELS, MIN_LEAD_SCORE } from "@/lib/jarvis/lead-research/lead-qualification";

export const RESEARCH_OUTPUT_FIELDS = [
  "Leadstatus",
  "Lead-Typ",
  "Firma / Organisation",
  "Quelle",
  "Quelle-Typ",
  "Titel des Treffers",
  "Ort",
  "Branche",
  "Bedarfssignal",
  "Warum relevant für TKND",
  "Passende TKND-Module",
  "Score",
  "Priorität",
  "Empfohlene nächste Aktion",
  "Empfohlene Ansprache",
  "Ausschlussgrund",
] as const;
