import type { IndustryPriority, ResearchSignalType } from "@/lib/jarvis/lead-research/constants";
import {
  ANNOUNCEMENT_KEYWORDS,
  INDUSTRY_PRIORITY_A,
  INDUSTRY_PRIORITY_B,
  INDUSTRY_PRIORITY_C,
  JOB_KEYWORDS,
  TENDER_KEYWORDS,
} from "@/lib/jarvis/lead-research/constants";
import {
  isKnownPartnerOrganization,
  isPartnerLeadSignal,
  rejectLeadQuality,
  type QualityCheckInput,
} from "@/lib/jarvis/lead-research/quality-filter";
import {
  hasTenderProcurementMarkers,
  isBlockedMediaSource,
  isGenericNewsContent,
  isTrustedTenderSource,
} from "@/lib/jarvis/lead-research/media-block";

export type LeadType =
  | "endkunde"
  | "partner"
  | "ausschreibung"
  | "stelle"
  | "beobachtung"
  | "kein_lead";

export type LeadPriority = "A" | "B" | "C" | "D" | "keine";

export const MIN_LEAD_SCORE = 60;

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  endkunde: "Endkunde",
  partner: "Partner",
  ausschreibung: "Ausschreibung",
  stelle: "Stelle",
  beobachtung: "Beobachtung",
  kein_lead: "Kein Lead",
};

export const TKND_MODULES = [
  "NIS2-Betroffenheitsprüfung",
  "Risiko- und Maßnahmenmanagement",
  "Aufgabensteuerung",
  "Incident Response",
  "Lieferantenmanagement",
  "Schulungen & Nachweise",
  "Compliance-Scoring",
  "Datenqualität",
  "Audit-Ordner / Exporte",
  "Dashboard / Management-Sicht",
  "Team- und Mandantenfähigkeit",
] as const;

export interface ResearchSignalInput extends QualityCheckInput {
  industry?: string | null;
  employee_count?: string | null;
  source_platform?: string | null;
}

export interface LeadQualification {
  accepted: boolean;
  reject_reason: string | null;
  research_score: number;
  score_reason: string;
  lead_type: LeadType;
  lead_priority: LeadPriority;
  industry_priority: IndustryPriority;
  demand_signal: string;
  signal_art: string;
  tknd_modules: string[];
  recommended_action: string;
  relevance_note: string;
  keywords_matched: string[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

function matchKeywords(text: string, keywords: readonly string[]): string[] {
  const n = normalize(text);
  return keywords.filter((kw) => {
    const k = kw.toLowerCase();
    if (k === "isb") return /\bisb\b/.test(n);
    return n.includes(k);
  });
}

export function classifyIndustryPriority(industry: string | null | undefined): IndustryPriority {
  const text = normalize(industry ?? "");
  if (INDUSTRY_PRIORITY_A.some((k) => text.includes(k))) return "A";
  if (INDUSTRY_PRIORITY_B.some((k) => text.includes(k))) return "B";
  if (INDUSTRY_PRIORITY_C.some((k) => text.includes(k))) return "C";
  return "B";
}

function parseEmployees(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = String(value).replace(/\./g, "").match(/\d+/);
  return n ? Number(n[0]) : null;
}

function inferSignalArt(signalType: ResearchSignalType): string {
  if (signalType === "job") return "Stellenanzeige";
  if (signalType === "tender") return "Ausschreibung";
  if (signalType === "announcement") return "Unternehmensmeldung";
  return "Beobachtung";
}

function inferLeadType(
  signalType: ResearchSignalType,
  isPartner: boolean
): LeadType {
  if (isPartner) return "partner";
  if (signalType === "tender") return "ausschreibung";
  if (signalType === "job") return "stelle";
  if (signalType === "announcement") return "endkunde";
  return "beobachtung";
}

function pickTkndModules(combined: string, signalType: ResearchSignalType): string[] {
  const n = normalize(combined);
  const modules = new Set<string>();

  if (/\bnis2\b/.test(n)) modules.add("NIS2-Betroffenheitsprüfung");
  if (/risiko|maßnahme|grundschutz|isms|dora/.test(n)) modules.add("Risiko- und Maßnahmenmanagement");
  if (/aufgabe|umsetzung|projekt|governance/.test(n)) modules.add("Aufgabensteuerung");
  if (/incident|notfall|bcm|business continuity/.test(n)) modules.add("Incident Response");
  if (/lieferant|vendor|zulieferer/.test(n)) modules.add("Lieferantenmanagement");
  if (/schulung|awareness|nachweis/.test(n)) modules.add("Schulungen & Nachweise");
  if (/audit|zertifizierung|iso\s*27001/.test(n)) modules.add("Audit-Ordner / Exporte");
  if (/management|governance|dashboard|asset/.test(n)) modules.add("Dashboard / Management-Sicht");
  if (/compliance|regulatorik|scoring/.test(n)) modules.add("Compliance-Scoring");
  if (/datenqualität|asset management/.test(n)) modules.add("Datenqualität");
  if (/beratung|mandant|partner|msp|systemhaus/.test(n)) modules.add("Team- und Mandantenfähigkeit");

  if (modules.size === 0) {
    if (signalType === "tender" || signalType === "job") {
      modules.add("Risiko- und Maßnahmenmanagement");
      modules.add("Aufgabensteuerung");
    }
    if (/\bnis2\b/.test(n)) modules.add("NIS2-Betroffenheitsprüfung");
  }

  return [...modules];
}

function recommendAction(
  leadType: LeadType,
  leadPriority: LeadPriority,
  signalType: ResearchSignalType
): string {
  if (leadType === "partner") return "Partnergespräch anbieten — Mandanten- und White-Label-Modus vorstellen";
  if (signalType === "tender") return "Ausschreibung prüfen und passendes Angebot vorbereiten";
  if (signalType === "job") {
    return leadPriority === "A"
      ? "IT-Leitung oder Geschäftsführung anschreiben"
      : "LinkedIn-Kontakt zur offenen Security-Rolle vorbereiten";
  }
  if (leadPriority === "A") return "Geschäftsführer oder IT-Leitung direkt anschreiben";
  if (leadPriority === "B") return "IT-Leitung anschreiben mit Bezug auf sichtbaren Security-Ausbau";
  return "Beobachten und in 30 Tagen erneut prüfen";
}

function buildDemandSignal(
  input: ResearchSignalInput,
  keywords: string[]
): string {
  const parts = [input.title, input.description].filter(Boolean);
  if (parts.length > 0) return parts.join(" — ").slice(0, 500);
  return keywords.length > 0 ? `Schlüsselbegriffe: ${keywords.join(", ")}` : "Konkretes Bedarfssignal";
}

function hasDirectNis2ComplianceRole(n: string): boolean {
  return (
    /nis2[\s-]*(compliance|umsetzung)/.test(n) ||
    /(operational technology|ot)[\s\w]*security[\s\w]*nis2/.test(n) ||
    /team lead[\s\w]*nis2/.test(n)
  );
}

function hasNis2DoraRole(n: string): boolean {
  return /\bnis2\b/.test(n) && /\bdora\b/.test(n);
}

function hasIsbOrSecurityLeadRole(n: string): boolean {
  return (
    /informationssicherheitsbeauftragter/.test(n) ||
    /\bisb\b/.test(n) ||
    /\bciso\b/.test(n) ||
    /isms[\s-]*manager/.test(n) ||
    /iso[\s-]*27001[\s-]*manager/.test(n)
  );
}

function hasSecurityJobRole(n: string): boolean {
  return (
    /it[\s-]*security/.test(n) ||
    /cyber[\s-]*security/.test(n) ||
    /compliance[\s-]*manager/.test(n) ||
    /security[\s-]*officer/.test(n) ||
    /business continuity/.test(n) ||
    /ot[\s-]*security/.test(n) ||
    /it[\s-]*risk/.test(n) ||
    /dora[\s-]*manager/.test(n)
  );
}

function hasNis2Tender(
  n: string,
  sourceUrl?: string | null,
  sourcePlatform?: string | null
): boolean {
  if (!/\bnis2\b/.test(n)) return false;
  if (!/(umsetzung|ausschreibung|vergabe|einführung|compliance)/.test(n)) return false;
  if (isGenericNewsContent(n)) return false;

  const trusted = isTrustedTenderSource(sourceUrl, sourcePlatform);
  const procurement = hasTenderProcurementMarkers(n);
  if (!trusted && !procurement) return false;

  return true;
}

function hasIsmsIsoTender(
  n: string,
  sourceUrl?: string | null,
  sourcePlatform?: string | null
): boolean {
  const hasTopic =
    /iso\s*27001/.test(n) || /\bisms\b/.test(n) || /informationssicherheitsmanagement/.test(n);
  const hasAction = /(aufbau|einführung|ausschreibung|vergabe|implementierung)/.test(n);
  if (!hasTopic || !hasAction) return false;
  if (isGenericNewsContent(n)) return false;
  return isTrustedTenderSource(sourceUrl, sourcePlatform) || hasTenderProcurementMarkers(n);
}

function scoreLead(input: ResearchSignalInput, combined: string, isPartner: boolean): {
  research_score: number;
  score_reason: string;
  lead_priority: LeadPriority;
} {
  const n = normalize(combined);
  const hasNis2 = /\bnis2\b/.test(n);
  const hasIso = /iso\s*27001/.test(n);
  const hasIsms = /\bisms\b/.test(n) || /informationssicherheitsmanagement/.test(n);
  const hasDora = /\bdora\b/.test(n);
  const industry_priority = classifyIndustryPriority(input.industry);

  if (isBlockedMediaSource(input)) {
    return {
      research_score: 0,
      score_reason: "Nachrichtenportal / allgemeiner Artikel — kein Lead",
      lead_priority: "keine",
    };
  }

  if (isPartner) {
    if (input.signal_type === "job" && hasNis2) {
      return {
        research_score: 70,
        score_reason: "Systemhaus/Berater baut NIS2-Leistungen für Kunden auf (Partner, nicht Endkunde)",
        lead_priority: "C",
      };
    }
    if (isPartnerLeadSignal(combined, input.industry)) {
      return {
        research_score: 60,
        score_reason: "Partner mit erkennbarem NIS2-/ISMS-Angebot für Kunden",
        lead_priority: "C",
      };
    }
    return {
      research_score: 50,
      score_reason: "Partnerpotenzial, aber kein klarer TKND-Anknüpfungspunkt",
      lead_priority: "D",
    };
  }

  if (input.signal_type === "tender" && hasNis2Tender(n, input.source_url, input.source_platform)) {
    return {
      research_score: 100,
      score_reason: "Konkrete NIS2-Ausschreibung",
      lead_priority: "A",
    };
  }

  if (input.signal_type === "job" && hasDirectNis2ComplianceRole(n)) {
    return {
      research_score: 95,
      score_reason: "Stelle mit direkter NIS2-Compliance-Verantwortung",
      lead_priority: "A",
    };
  }

  if (input.signal_type === "job" && hasNis2DoraRole(n)) {
    return {
      research_score: 90,
      score_reason: "NIS2 und DORA konkret in der Rolle genannt",
      lead_priority: "A",
    };
  }

  if (input.signal_type === "tender" && hasIsmsIsoTender(n, input.source_url, input.source_platform)) {
    return {
      research_score: 90,
      score_reason: "ISMS-/ISO27001-Ausschreibung",
      lead_priority: "A",
    };
  }

  if (input.signal_type === "job" && hasIsbOrSecurityLeadRole(n)) {
    return {
      research_score: 90,
      score_reason: "ISB / ISMS Manager / ISO27001 Manager wird aktiv gesucht",
      lead_priority: "A",
    };
  }

  if (input.signal_type === "tender" && (hasIsms || hasIso || /cybersecurity/.test(n) || /bsi/.test(n))) {
    return {
      research_score: 90,
      score_reason: "Informationssicherheits-Projekt ausgeschrieben",
      lead_priority: "A",
    };
  }

  if (input.signal_type === "job" && hasSecurityJobRole(n) && (hasNis2 || hasIso || hasIsms || hasDora)) {
    return {
      research_score: 80,
      score_reason: "Security-/Compliance-Stelle mit NIS2, ISO27001, ISMS oder DORA-Bezug",
      lead_priority: "A",
    };
  }

  if (input.signal_type === "job" && hasSecurityJobRole(n)) {
    return {
      research_score: 80,
      score_reason: "Unternehmen baut Informationssicherheitsbereich sichtbar aus",
      lead_priority: "B",
    };
  }

  if (
    /wir (führen ein|bauen auf|bereiten uns vor|erweitern|professionalisieren)/.test(n) &&
    (hasIso || hasIsms || hasNis2)
  ) {
    return {
      research_score: 70,
      score_reason: "Unternehmen baut Informationssicherheit / Compliance sichtbar aus",
      lead_priority: "B",
    };
  }

  if (industry_priority !== "C" && input.signal_type === "job" && hasSecurityJobRole(n)) {
    return {
      research_score: 70,
      score_reason: "NIS2-relevante Branche mit offener Security-/Compliance-Stelle",
      lead_priority: "B",
    };
  }

  const employees = parseEmployees(input.employee_count);
  if (employees && employees >= 50 && (hasIso || hasIsms || /informationssicherheit/.test(n))) {
    return {
      research_score: 60,
      score_reason: "Größe + Informationssicherheitsbezug",
      lead_priority: "B",
    };
  }

  if (hasNis2) {
    return {
      research_score: 20,
      score_reason: "Nur NIS2-Erwähnung ohne echtes Bedarfssignal — maximal 20 Punkte",
      lead_priority: "keine",
    };
  }

  return {
    research_score: 0,
    score_reason: "Kein ausreichend konkretes Bedarfssignal",
    lead_priority: "keine",
  };
}

export function qualifyResearchLead(input: ResearchSignalInput): LeadQualification {
  const combined = [input.title, input.description, input.company_name, input.industry]
    .filter(Boolean)
    .join(" ");

  if (isBlockedMediaSource(input)) {
    return {
      accepted: false,
      reject_reason: "Nachrichtenportal / allgemeiner Artikel — kein Lead",
      research_score: 0,
      score_reason: "Nachrichtenportal / allgemeiner Artikel — kein Lead",
      lead_type: "kein_lead",
      lead_priority: "keine",
      industry_priority: classifyIndustryPriority(input.industry),
      demand_signal: buildDemandSignal(input, []),
      signal_art: inferSignalArt(input.signal_type),
      tknd_modules: [],
      recommended_action: "Nicht übernehmen",
      relevance_note: "Nachrichtenportal / allgemeiner Artikel",
      keywords_matched: [],
    };
  }

  const rejectReason = rejectLeadQuality(input);
  const isPartner =
    isKnownPartnerOrganization(input.company_name, input.industry, combined) ||
    isPartnerLeadSignal(combined, input.industry);

  const tenderKw = matchKeywords(combined, TENDER_KEYWORDS);
  const jobKw = matchKeywords(combined, JOB_KEYWORDS);
  const annKw = matchKeywords(combined, ANNOUNCEMENT_KEYWORDS);
  const allKw = [...new Set([...tenderKw, ...jobKw, ...annKw])];

  const industry_priority = classifyIndustryPriority(input.industry);
  const signal_art = inferSignalArt(input.signal_type);
  const demand_signal = buildDemandSignal(input, allKw);

  if (rejectReason) {
    return {
      accepted: false,
      reject_reason: rejectReason,
      research_score: 0,
      score_reason: rejectReason,
      lead_type: "kein_lead",
      lead_priority: "keine",
      industry_priority,
      demand_signal,
      signal_art,
      tknd_modules: [],
      recommended_action: "Nicht übernehmen",
      relevance_note: rejectReason,
      keywords_matched: allKw,
    };
  }

  const scored = scoreLead(input, combined, isPartner);
  const lead_type = inferLeadType(input.signal_type, isPartner);
  const tknd_modules = pickTkndModules(combined, input.signal_type);

  if (scored.research_score < MIN_LEAD_SCORE) {
    const observation = scored.research_score >= 50;
    return {
      accepted: false,
      reject_reason: observation
        ? `Score ${scored.research_score} — unter ${MIN_LEAD_SCORE}, nur Beobachtung`
        : scored.score_reason,
      research_score: scored.research_score,
      score_reason: scored.score_reason,
      lead_type: observation ? "beobachtung" : "kein_lead",
      lead_priority: observation ? "D" : "keine",
      industry_priority,
      demand_signal,
      signal_art,
      tknd_modules,
      recommended_action: "Nicht übernehmen",
      relevance_note: scored.score_reason,
      keywords_matched: allKw,
    };
  }

  const relevance_note = isPartner
    ? "Partnerpotenzial für TKND Team- und Mandantenfähigkeit"
    : `Passt zu TKND: ${tknd_modules.slice(0, 3).join(", ")}`;

  return {
    accepted: true,
    reject_reason: null,
    research_score: scored.research_score,
    score_reason: scored.score_reason,
    lead_type,
    lead_priority: scored.lead_priority === "keine" ? "B" : scored.lead_priority,
    industry_priority,
    demand_signal,
    signal_art,
    tknd_modules,
    recommended_action: recommendAction(lead_type, scored.lead_priority, input.signal_type),
    relevance_note,
    keywords_matched: allKw,
  };
}

/** @deprecated Nutze qualifyResearchLead */
export function scoreResearchSignal(input: ResearchSignalInput): LeadQualification {
  return qualifyResearchLead(input);
}
