export const LEAD_RESEARCH_SYSTEM_PROMPT = `Du bist Jarvis, ein deutscher B2B Lead-Research-Agent für NIS2-Compliance.

Ziel:
Finde ausschließlich Unternehmen, die aktuell einen konkreten oder zeitnahen Bedarf an NIS2-Umsetzung, Informationssicherheit, ISMS oder Cybersecurity-Dokumentation haben.

Suche täglich nach Ausschreibungen, Stellenanzeigen und Unternehmensmeldungen.
Priorisiere IT-Systemhäuser, MSPs und NIS2-relevante Branchen.

Kein Auto-Versand. Keine Kontaktanfragen ohne Freigabe durch Nico.`;

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

/** Automatisch via Open-Data-API (aggregiert u. a. bund.de, Länder, Kommunen). */
export const TENDER_SOURCES_AUTOMATED = ["oeffentlichevergabe.de", "bund.de"] as const;

export const TENDER_SOURCES = [
  "oeffentlichevergabe.de",
  "bund.de",
  "evergabe.de",
  "Vergabe24",
  "DTAD",
  "Subreport",
] as const;

/** Automatisch via BA Jobsuche + Stepstone HTML-Scraper. */
export const JOB_SOURCES_AUTOMATED = ["arbeitsagentur.de", "Stepstone"] as const;

export const JOB_SOURCES = ["Stepstone", "Indeed", "LinkedIn Jobs", "Xing Jobs"] as const;

export const ANNOUNCEMENT_SOURCES = ["LinkedIn", "Unternehmenswebseite", "Pressemitteilung"] as const;

export const ANNOUNCEMENT_SOURCES_AUTOMATED = ["Google News"] as const;

export const SCRAPER_RSS_PLATFORMS = [
  "evergabe.de",
  "Vergabe24",
  "DTAD",
  "Subreport",
] as const;

export const TENDER_KEYWORDS = [
  "NIS2",
  "Informationssicherheit",
  "ISMS",
  "ISO 27001",
  "ISO27001",
  "BSI Grundschutz",
  "Risikomanagement",
  "Informationssicherheitsbeauftragter",
  "Cybersecurity",
] as const;

export const JOB_KEYWORDS = [
  "Informationssicherheitsbeauftragter",
  "ISB",
  "IT Security Manager",
  "Cyber Security Manager",
  "Compliance Manager",
  "ISO 27001",
  "NIS2",
] as const;

export const ANNOUNCEMENT_KEYWORDS = [
  "NIS2",
  "Cybersecurity",
  "ISO27001",
  "Informationssicherheit",
  "ISMS",
  "Audit",
  "Compliance",
] as const;

export const INDUSTRY_PRIORITY_A = [
  "it-systemhaus",
  "systemhaus",
  "msp",
  "managed service",
  "rechenzentrum",
  "cloud",
  "software",
  "it-dienstleister",
] as const;

export const INDUSTRY_PRIORITY_B = [
  "maschinenbau",
  "automobil",
  "zulieferer",
  "logistik",
  "energie",
  "lebensmittel",
] as const;

export const INDUSTRY_PRIORITY_C = [
  "gesundheit",
  "forschung",
  "chemie",
  "wasser",
  "entsorgung",
] as const;

export const RESEARCH_SCORE_LABELS: Record<number, string> = {
  100: "NIS2 explizit genannt",
  80: "ISO 27001 Einführung gesucht",
  70: "ISB / Security Manager Stelle offen",
  60: "Cybersecurity-Projekt ausgeschrieben",
  50: "Unternehmen fällt nach Größe wahrscheinlich unter NIS2",
};

/** Standard-Ausgabeformat pro Fund */
export const RESEARCH_OUTPUT_FIELDS = [
  "Firma",
  "Signal-Typ",
  "Quelle",
  "Score",
  "Begründung",
  "URL",
  "Region / Branche",
  "Branchen-Priorität",
  "Kontakt-Hinweis",
  "Empfohlene Aktion",
] as const;
