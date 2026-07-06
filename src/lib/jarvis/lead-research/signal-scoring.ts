import type { IndustryPriority, ResearchSignalType } from "@/lib/jarvis/lead-research/constants";
import {
  ANNOUNCEMENT_KEYWORDS,
  INDUSTRY_PRIORITY_A,
  INDUSTRY_PRIORITY_B,
  INDUSTRY_PRIORITY_C,
  JOB_KEYWORDS,
  TENDER_KEYWORDS,
} from "@/lib/jarvis/lead-research/constants";

export interface ResearchSignalInput {
  company_name: string;
  signal_type: ResearchSignalType;
  title?: string | null;
  description?: string | null;
  industry?: string | null;
  employee_count?: string | null;
}

export interface ResearchSignalScore {
  research_score: number;
  score_reason: string;
  industry_priority: IndustryPriority;
  keywords_matched: string[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

function matchKeywords(text: string, keywords: readonly string[]): string[] {
  const n = normalize(text);
  return keywords.filter((kw) => n.includes(kw.toLowerCase()));
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

export function scoreResearchSignal(input: ResearchSignalInput): ResearchSignalScore {
  const combined = [input.title, input.description, input.company_name, input.industry]
    .filter(Boolean)
    .join(" ");

  const tenderKw = matchKeywords(combined, TENDER_KEYWORDS);
  const jobKw = matchKeywords(combined, JOB_KEYWORDS);
  const annKw = matchKeywords(combined, ANNOUNCEMENT_KEYWORDS);
  const allKw = [...new Set([...tenderKw, ...jobKw, ...annKw])];

  const industry_priority = classifyIndustryPriority(input.industry);
  let research_score = 50;
  let score_reason = "Unternehmen fällt nach Größe/Profil wahrscheinlich unter NIS2";

  const hasNis2 = allKw.some((k) => k.toLowerCase().includes("nis2"));
  const hasIso = allKw.some((k) => k.includes("iso") && k.includes("27001"));
  const hasIsbJob =
    input.signal_type === "job" &&
    (jobKw.some((k) => k.includes("isb") || k.includes("informationssicherheitsbeauftragter")) ||
      normalize(combined).includes("security manager"));
  const hasCyberTender =
    input.signal_type === "tender" &&
    (tenderKw.some((k) => k.includes("cyber")) || normalize(combined).includes("cybersecurity"));

  if (hasNis2) {
    research_score = 100;
    score_reason = "NIS2 explizit genannt";
  } else if (hasIso) {
    research_score = 80;
    score_reason = "ISO 27001 Einführung / Bezug erkannt";
  } else if (hasIsbJob) {
    research_score = 70;
    score_reason = "ISB / Security Manager Stelle offen";
  } else if (hasCyberTender) {
    research_score = 60;
    score_reason = "Cybersecurity-Projekt ausgeschrieben";
  } else {
    const employees = parseEmployees(input.employee_count);
    if (employees && employees >= 50) {
      research_score = 50;
      score_reason = "Unternehmen fällt nach Größe wahrscheinlich unter NIS2";
    }
  }

  if (industry_priority === "A" && research_score < 100) {
    research_score = Math.min(100, research_score + 5);
    score_reason += " · Priorität A Branche";
  }

  return {
    research_score,
    score_reason,
    industry_priority,
    keywords_matched: allKw,
  };
}
