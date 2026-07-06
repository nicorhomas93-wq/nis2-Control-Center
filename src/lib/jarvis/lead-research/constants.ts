export const LEAD_RESEARCH_SYSTEM_PROMPT = `Du bist Jarvis, ein deutscher B2B-Lead-Research-Agent für das TKND NIS2 Control Center.

WICHTIG: Du suchst KEINE allgemeinen Nachrichtenartikel, Blogbeiträge, Ratgeberseiten, Kanzleiartikel oder Marketingseiten über NIS2.

Du suchst ausschließlich konkrete Bedarfssignale von Organisationen mit akutem oder sehr wahrscheinlichem Bedarf an NIS2-Dokumentation, Risikomanagement, Maßnahmenmanagement, Audit-Nachweisen oder Lieferantenbewertung.

Erlaubte Signale: Stellenanzeigen (ISB, Security Manager, ISMS), Ausschreibungen (NIS2, ISMS, ISO27001), konkrete Unternehmensmeldungen, Partnerpotenzial (MSP/Berater).

Qualität vor Menge. Lieber 5 sehr gute Leads als 100 schlechte Treffer.
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
  "NIS2",
  "NIS2 Umsetzung",
  "ISMS Aufbau",
  "ISO 27001 Einführung",
  "Informationssicherheitsmanagement",
  "BSI IT-Grundschutz",
  "Risikoanalyse Informationssicherheit",
  "Lieferantensicherheitsbewertung",
  "Security Awareness",
  "Incident Response Konzept",
  "Notfallmanagement",
  "Audit-Vorbereitung Informationssicherheit",
  "Cybersecurity",
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
  "stadtwerk",
  "klinik",
  "krankenhaus",
  "produktion",
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
  100: "NIS2-Ausschreibung oder explizite NIS2-Suche",
  90: "ISMS-/ISO27001-Ausschreibung oder ISB gesucht",
  80: "Security-/Compliance-Stelle mit NIS2/ISO-Bezug",
  70: "Unternehmen baut Informationssicherheit aus",
  60: "NIS2-Branche + offene Security-Stelle",
  50: "Partner mit NIS2-/ISMS-Angebot",
};

export const LEAD_PRIORITY_LABELS: Record<string, string> = {
  A: "Akuter Bedarf wahrscheinlich",
  B: "Hoher Bedarf wahrscheinlich",
  C: "Partnerpotenzial",
  D: "Beobachten / nicht übernehmen",
};

export { LEAD_TYPE_LABELS } from "@/lib/jarvis/lead-research/lead-qualification";

export const RESEARCH_OUTPUT_FIELDS = [
  "Lead-Typ",
  "Firma / Organisation",
  "Website",
  "Ort",
  "Branche",
  "Mitarbeitergröße",
  "Bedarfssignal",
  "Signal-Art",
  "Quelle",
  "Datum / Aktualität",
  "Relevanz für TKND",
  "Passende TKND-Module",
  "Leadscore",
  "Priorität",
  "Empfohlene nächste Aktion",
  "Empfohlene Ansprache",
] as const;
