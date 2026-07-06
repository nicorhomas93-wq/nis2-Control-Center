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
  isPartnerLeadSignal,
  rejectLeadQuality,
  type QualityCheckInput,
} from "@/lib/jarvis/lead-research/quality-filter";

export type LeadType = "endkunde" | "partner" | "ausschreibung" | "stelle" | "beobachtung";
export type LeadPriority = "A" | "B" | "C" | "D";

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  endkunde: "Endkunde",
  partner: "Partner",
  ausschreibung: "Ausschreibung",
  stelle: "Stelle",
  beobachtung: "Beobachtung",
};

export const TKND_MODULES = [
  "Betroffenheitsprüfung",
  "Risiko- und Maßnahmenmanagement",
  "Aufgabensteuerung",
  "Incident Response",
  "Lieferantenmanagement",
  "Schulungen & Nachweise",
  "Audit-Ordner / Exporte",
  "Dashboard / Management-Sicht",
  "Compliance-Scoring",
  "Mandantenfähigkeit",
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

  if (/\bnis2\b/.test(n)) modules.add("Betroffenheitsprüfung");
  if (/risiko|maßnahme|grundschutz|isms/.test(n)) modules.add("Risiko- und Maßnahmenmanagement");
  if (/aufgabe|umsetzung|projekt/.test(n)) modules.add("Aufgabensteuerung");
  if (/incident|notfall|bcm|business continuity/.test(n)) modules.add("Incident Response");
  if (/lieferant|vendor|zulieferer/.test(n)) modules.add("Lieferantenmanagement");
  if (/schulung|awareness|nachweis/.test(n)) modules.add("Schulungen & Nachweise");
  if (/audit|zertifizierung|iso\s*27001/.test(n)) modules.add("Audit-Ordner / Exporte");
  if (/management|governance|dashboard/.test(n)) modules.add("Dashboard / Management-Sicht");
  if (/compliance|regulatorik/.test(n)) modules.add("Compliance-Scoring");
  if (/beratung|mandant|partner|msp|systemhaus/.test(n)) modules.add("Mandantenfähigkeit");

  if (modules.size === 0) {
    if (signalType === "tender" || signalType === "job") {
      modules.add("Risiko- und Maßnahmenmanagement");
      modules.add("Aufgabensteuerung");
    }
    if (/\bnis2\b/.test(n)) modules.add("Betroffenheitsprüfung");
  }

  return [...modules];
}

function recommendAction(
  leadType: LeadType,
  leadPriority: LeadPriority,
  signalType: ResearchSignalType
): string {
  if (leadType === "partner") return "Partnergespräch anbieten — White-Label/Mandanten-Modus vorstellen";
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

export function qualifyResearchLead(input: ResearchSignalInput): LeadQualification {
  const combined = [input.title, input.description, input.company_name, input.industry]
    .filter(Boolean)
    .join(" ");

  const rejectReason = rejectLeadQuality(input);
  const isPartner = isPartnerLeadSignal(combined, input.industry);
  const tenderKw = matchKeywords(combined, TENDER_KEYWORDS);
  const jobKw = matchKeywords(combined, JOB_KEYWORDS);
  const annKw = matchKeywords(combined, ANNOUNCEMENT_KEYWORDS);
  const allKw = [...new Set([...tenderKw, ...jobKw, ...annKw])];

  const industry_priority = classifyIndustryPriority(input.industry);
  const signal_art = inferSignalArt(input.signal_type);
  const lead_type = inferLeadType(input.signal_type, isPartner);
  const demand_signal = buildDemandSignal(input, allKw);
  const tknd_modules = pickTkndModules(combined, input.signal_type);

  const n = normalize(combined);
  const hasNis2 = /\bnis2\b/.test(n);
  const hasIso = /iso\s*27001/.test(n);
  const hasIsms = /\bisms\b/.test(n) || /informationssicherheitsmanagement/.test(n);
  const hasIsbJob =
    input.signal_type === "job" &&
    (/informationssicherheitsbeauftragter/.test(n) ||
      /\bisb\b/.test(n) ||
      /security manager/.test(n) ||
      /compliance manager/.test(n) ||
      /ciso/.test(n));
  const hasSecurityJob =
    input.signal_type === "job" &&
    (/it[\s-]*security/.test(n) || /cyber[\s-]*security/.test(n) || /isms[\s-]*manager/.test(n));
  const hasSecurityTender =
    input.signal_type === "tender" &&
    (hasNis2 || hasIsms || hasIso || /cybersecurity/.test(n) || /bsi/.test(n));

  let research_score = 0;
  let score_reason = "Unterhalb Mindestrelevanz";
  let lead_priority: LeadPriority = "D";

  if (isPartner) {
    research_score = 50;
    score_reason = "Partner mit NIS2-/ISMS-Angebot für Kunden";
    lead_priority = "C";
  } else if (hasNis2 && input.signal_type === "tender") {
    research_score = 100;
    score_reason = "Konkrete NIS2-Ausschreibung";
    lead_priority = "A";
  } else if (hasNis2 && (input.signal_type === "job" || /wir suchen|unterstützung/.test(n))) {
    research_score = 100;
    score_reason = "Explizite NIS2-Unterstützung oder NIS2-Rolle gesucht";
    lead_priority = "A";
  } else if ((hasIsms || hasIso) && input.signal_type === "tender") {
    research_score = 90;
    score_reason = "ISMS-/ISO27001-Ausschreibung";
    lead_priority = "A";
  } else if (hasIsbJob) {
    research_score = 90;
    score_reason = "Aktiv ISB / Security Manager gesucht";
    lead_priority = "A";
  } else if (hasSecurityJob && (hasNis2 || hasIso || hasIsms)) {
    research_score = 80;
    score_reason = "Security-/Compliance-Stelle mit NIS2/ISO/ISMS-Bezug";
    lead_priority = "A";
  } else if (hasSecurityJob) {
    research_score = 80;
    score_reason = "IT-Security-/Compliance-Stelle offen";
    lead_priority = "B";
  } else if (hasSecurityTender) {
    research_score = 90;
    score_reason = "Informationssicherheits-Projekt ausgeschrieben";
    lead_priority = "A";
  } else if (/wir (führen ein|bauen auf|bereiten uns vor|erweitern)/.test(n) && (hasIso || hasIsms || hasNis2)) {
    research_score = 70;
    score_reason = "Unternehmen baut Informationssicherheit sichtbar aus";
    lead_priority = "B";
  } else if (industry_priority !== "C" && hasSecurityJob) {
    research_score = 60;
    score_reason = "NIS2-relevante Branche + offene Security-Stelle";
    lead_priority = "B";
  } else {
    const employees = parseEmployees(input.employee_count);
    if (employees && employees >= 50 && (hasIso || hasIsms || /informationssicherheit/.test(n))) {
      research_score = 60;
      score_reason = "Größe + Informationssicherheitsbezug";
      lead_priority = "B";
    }
  }

  if (rejectReason) {
    return {
      accepted: false,
      reject_reason: rejectReason,
      research_score: 0,
      score_reason: rejectReason,
      lead_type: "beobachtung",
      lead_priority: "D",
      industry_priority,
      demand_signal,
      signal_art,
      tknd_modules: [],
      recommended_action: "Nicht übernehmen",
      relevance_note: rejectReason,
      keywords_matched: allKw,
    };
  }

  if (research_score < 50) {
    return {
      accepted: false,
      reject_reason: "Score unter 50 — nicht übernehmen",
      research_score,
      score_reason,
      lead_type: "beobachtung",
      lead_priority: "D",
      industry_priority,
      demand_signal,
      signal_art,
      tknd_modules,
      recommended_action: "Nicht übernehmen",
      relevance_note: "Kein ausreichend konkretes Bedarfssignal",
      keywords_matched: allKw,
    };
  }

  const relevance_note = isPartner
    ? "Partnerpotenzial für TKND Mandantenfähigkeit und White-Label"
    : `Passt zu TKND: ${tknd_modules.slice(0, 3).join(", ")}`;

  return {
    accepted: true,
    reject_reason: null,
    research_score,
    score_reason,
    lead_type,
    lead_priority,
    industry_priority,
    demand_signal,
    signal_art,
    tknd_modules,
    recommended_action: recommendAction(lead_type, lead_priority, input.signal_type),
    relevance_note,
    keywords_matched: allKw,
  };
}

/** @deprecated Nutze qualifyResearchLead */
export function scoreResearchSignal(input: ResearchSignalInput): LeadQualification {
  return qualifyResearchLead(input);
}
