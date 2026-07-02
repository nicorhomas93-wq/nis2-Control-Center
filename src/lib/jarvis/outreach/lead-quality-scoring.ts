import { isLeadContactable } from "@/lib/jarvis/outreach/contact-enrichment";
import { LEAD_FINDER_MIN_SCORE } from "@/lib/jarvis/outreach/constants";

export type PartnerPotential = "white_label" | "reseller" | "end_customer";
export type OutreachPriority = "high" | "medium" | "low";

export interface LeadQualityInput {
  company_name: string;
  industry: string | null;
  employee_count?: string | number | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  has_contact_form?: boolean;
  linkedin_url?: string | null;
  hints?: string | null;
  lead_category?: string | null;
  deprioritized?: boolean;
}

export interface LeadQualityResult {
  lead_quality_score: number;
  lead_quality_reason: string;
  is_contactable: boolean;
  partner_potential: PartnerPotential;
  outreach_priority: OutreachPriority;
  breakdown: string[];
  qualifies_for_finder: boolean;
}

const TARGET_INDUSTRY_KEYWORDS = [
  "it-dienstleister",
  "it dienstleister",
  "systemhaus",
  "msp",
  "managed service",
  "cybersecurity",
  "it-sicherheit",
  "security",
  "datenschutz",
  "iso 27001",
  "iso27001",
  "compliance",
  "nis2",
  "outsourcing",
  "it-beratung",
  "it beratung",
  "cloud",
  "microsoft 365",
  "m365",
];

const WHITE_LABEL_SIGNALS = [
  "white-label",
  "white label",
  "partnerprogramm",
  "reseller",
  "channel partner",
  "systemhaus",
  "msp",
  "managed service",
];

const RESELLER_SIGNALS = [
  "reseller",
  "vertriebspartner",
  "partner",
  "channel",
  "distribution",
  "systemhaus",
  "msp",
  "it-dienstleister",
];

function parseEmployees(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  const n = String(value).replace(/\./g, "").match(/\d+/);
  return n ? Number(n[0]) : null;
}

function buildSearchText(input: LeadQualityInput): string {
  return [
    input.company_name,
    input.industry ?? "",
    input.hints ?? "",
    input.lead_category ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function matchesTargetIndustry(text: string): boolean {
  return TARGET_INDUSTRY_KEYWORDS.some((kw) => text.includes(kw));
}

function classifyPartnerPotential(
  input: LeadQualityInput,
  text: string
): PartnerPotential {
  if (input.deprioritized || input.lead_category === "nicht_priorisiert") {
    return "end_customer";
  }

  const whiteLabel = WHITE_LABEL_SIGNALS.some((s) => text.includes(s));
  const reseller = RESELLER_SIGNALS.some((s) => text.includes(s));

  if (whiteLabel) return "white_label";
  if (reseller || matchesTargetIndustry(text)) return "reseller";
  return "end_customer";
}

function priorityFromScore(
  score: number,
  potential: PartnerPotential
): OutreachPriority {
  if (score < LEAD_FINDER_MIN_SCORE) return "low";
  if (score >= 90 || (score >= LEAD_FINDER_MIN_SCORE && potential !== "end_customer")) {
    return "high";
  }
  return "medium";
}

export function scoreLeadQuality(input: LeadQualityInput): LeadQualityResult {
  const breakdown: string[] = [];
  let score = 0;

  const hasEmail = Boolean(input.contact_email?.trim());
  const hasPhone = Boolean(input.contact_phone?.trim());
  const hasForm = Boolean(input.has_contact_form);
  const hasLinkedIn = Boolean(input.linkedin_url?.trim());

  if (hasEmail) {
    score += 30;
    breakdown.push("+30 E-Mail vorhanden");
  }
  if (hasPhone) {
    score += 20;
    breakdown.push("+20 Telefonnummer vorhanden");
  }
  if (hasForm) {
    score += 20;
    breakdown.push("+20 Kontaktformular vorhanden");
  }

  const text = buildSearchText(input);
  if (matchesTargetIndustry(text)) {
    score += 30;
    breakdown.push("+30 Zielbranche passt");
  }

  const employees = parseEmployees(input.employee_count);
  if (employees != null && employees >= 20 && employees <= 500) {
    score += 20;
    breakdown.push(`+20 ${employees} MA (20–500)`);
  }

  if (hasLinkedIn) {
    score += 10;
    breakdown.push("+10 LinkedIn vorhanden");
  }

  const is_contactable = isLeadContactable(input);
  if (!is_contactable) {
    breakdown.push("0 — keine Kontaktmöglichkeit");
  }

  const partner_potential = classifyPartnerPotential(input, text);
  const outreach_priority = priorityFromScore(score, partner_potential);
  const qualifies_for_finder =
    is_contactable && score >= LEAD_FINDER_MIN_SCORE && partner_potential !== "end_customer";

  const potentialLabel =
    partner_potential === "white_label"
      ? "White-Label-Partner"
      : partner_potential === "reseller"
        ? "Reseller"
        : "Endkunde";

  const lead_quality_reason = [
    `Score ${score}`,
    potentialLabel,
    outreach_priority === "high"
      ? "Priorität Hoch"
      : outreach_priority === "medium"
        ? "Priorität Mittel"
        : "Priorität Niedrig",
    is_contactable ? "kontaktierbar" : "nicht kontaktierbar",
  ].join(" · ");

  return {
    lead_quality_score: score,
    lead_quality_reason,
    is_contactable,
    partner_potential,
    outreach_priority,
    breakdown,
    qualifies_for_finder,
  };
}
