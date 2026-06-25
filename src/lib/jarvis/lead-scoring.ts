import type { ConsentStatus } from "@/lib/jarvis/constants";

export type LeadScoreInput = {
  source?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  company_name?: string | null;
  consent_status?: ConsentStatus | string | null;
};

export type LeadScoreCategory = "hot" | "warm" | "watch" | "low";

export type LeadScoreResult = {
  score: number;
  category: LeadScoreCategory;
  categoryLabel: string;
  reasons: string[];
};

const HIGH_VALUE_INDUSTRIES = [
  "ict-dienstleistungen",
  "ict-d",
  "it-systemhaus",
  "msp",
  "compliance",
  "datenschutz",
  "industrie",
  "gesundheitswesen",
  "energie",
  "logistik",
];

const NIS2_KEYWORDS = [
  "nis2",
  "compliance",
  "audit",
  "it-sicherheit",
  "it sicherheit",
  "cyber",
  "bsi",
  "kritis",
  "meldepflicht",
];

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function industryMatches(industry: string): boolean {
  const normalized = normalize(industry);
  return HIGH_VALUE_INDUSTRIES.some(
    (item) => normalized.includes(item) || item.includes(normalized)
  );
}

function notesMentionNis2(notes: string): boolean {
  const normalized = normalize(notes);
  return NIS2_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function getLeadScoreCategory(score: number): LeadScoreCategory {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  if (score >= 20) return "watch";
  return "low";
}

export function getLeadScoreCategoryLabel(category: LeadScoreCategory): string {
  switch (category) {
    case "hot":
      return "Heiß";
    case "warm":
      return "Warm";
    case "watch":
      return "Beobachten";
    case "low":
      return "Niedrig";
  }
}

export function getLeadScoreCategoryColor(category: LeadScoreCategory): string {
  switch (category) {
    case "hot":
      return "bg-red-100 text-red-800";
    case "warm":
      return "bg-amber-100 text-amber-800";
    case "watch":
      return "bg-sky-100 text-sky-800";
    case "low":
      return "bg-slate-100 text-slate-600";
  }
}

export function calculateLeadScore(lead: LeadScoreInput): LeadScoreResult {
  let score = 0;
  const reasons: string[] = [];

  if (lead.source === "pilot_request") {
    score += 30;
    reasons.push("+30 Pilotanfrage (aktives Interesse)");
  }

  if (lead.industry && industryMatches(lead.industry)) {
    score += 20;
    reasons.push("+20 relevante Branche");
  }

  if (lead.email?.trim()) {
    score += 20;
    reasons.push("+20 E-Mail vorhanden");
  } else {
    score -= 20;
    reasons.push("-20 E-Mail fehlt");
  }

  if (lead.phone?.trim()) {
    score += 10;
    reasons.push("+10 Telefonnummer vorhanden");
  }

  if (lead.notes?.trim()) {
    score += 10;
    reasons.push("+10 Nachricht/Notizen vorhanden");
    if (notesMentionNis2(lead.notes)) {
      score += 10;
      reasons.push("+10 NIS2/Compliance-Bezug in Nachricht");
    }
  }

  if (lead.company_name?.trim()) {
    score += 10;
    reasons.push("+10 Unternehmensname vorhanden");
  }

  if (lead.consent_status === "no_contact") {
    score -= 50;
    reasons.push("-50 Kontakt untersagt (no_contact)");
  }

  score = Math.max(0, Math.min(100, score));
  const category = getLeadScoreCategory(score);

  return {
    score,
    category,
    categoryLabel: getLeadScoreCategoryLabel(category),
    reasons,
  };
}
