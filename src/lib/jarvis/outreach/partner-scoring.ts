import {
  classifyPartnerCategory,
  PARTNER_CATEGORY_LABELS,
  type PartnerLeadCategory,
} from "@/lib/jarvis/outreach/partner-categories";

export type PartnerScoreBand = "excellent" | "good" | "review" | "low";

export interface PartnerLeadInput {
  company_name: string;
  industry: string | null;
  employee_count?: string | number | null;
  city?: string | null;
  region?: string | null;
  hints?: string | null;
  website?: string | null;
  contact_role?: string | null;
}

export interface PartnerScoreResult {
  partner_score: number;
  score_band: PartnerScoreBand;
  lead_category: PartnerLeadCategory;
  score_reason: string;
  recommended_pitch: string;
  recommended_next_step: string;
  deprioritized: boolean;
  deprioritize_reason: string | null;
  breakdown: string[];
  auto_outreach: boolean;
}

const DACH_REGIONS = [
  "deutschland",
  "germany",
  "österreich",
  "austria",
  "schweiz",
  "switzerland",
  "dresden",
  "berlin",
  "münchen",
  "hamburg",
  "köln",
  "frankfurt",
  "wien",
  "zürich",
  "basel",
];

const EXCLUSION_GROUPS: { label: string; keywords: string[]; penalty: number }[] = [
  {
    label: "Gesundheitswesen / Pflege",
    keywords: [
      "krankenhaus",
      "klinik",
      "pflegeheim",
      "pflegeeinrichtung",
      "reha",
      "hospital",
      "medizinische versorgung",
    ],
    penalty: 30,
  },
  {
    label: "Öffentlicher Sektor",
    keywords: [
      "behörde",
      "kommune",
      "stadtverwaltung",
      "landratsamt",
      "ministerium",
      "öffentlich",
      "öffentlicher dienst",
      "schule",
      "universität",
      "hochschule",
      "gemeinde",
      "landkreis",
      "stadtwerke",
    ],
    penalty: 30,
  },
  {
    label: "Langsame Großorganisation",
    keywords: ["konzern", "holding", "fortune", "global player", "ausschreibung"],
    penalty: 20,
  },
];

const PARTNER_SERVICE_KEYWORDS = [
  "it-support",
  "managed services",
  "microsoft 365",
  "m365",
  "cloud",
  "backup",
  "firewall",
  "endpoint",
  "datenschutz",
  "informationssicherheit",
  "iso 27001",
  "nis2",
  "compliance",
  "notfall",
  "awareness",
  "phishing",
  "security",
  "beratung",
  "systemhaus",
  "msp",
];

const KMU_SIGNALS = ["kmu", "mittelstand", "b2b", "unternehmenskunden", "geschäftskunden"];

function parseEmployeeCount(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  const match = String(value).replace(/\./g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function buildSearchText(input: PartnerLeadInput): string {
  return [
    input.company_name,
    input.industry,
    input.city,
    input.region,
    input.hints,
    input.website,
    input.contact_role,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreBand(score: number): PartnerScoreBand {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "review";
  return "low";
}

function bandLabel(band: PartnerScoreBand): string {
  switch (band) {
    case "excellent":
      return "Sehr guter Partner-Lead";
    case "good":
      return "Guter Lead";
    case "review":
      return "Prüfen";
    case "low":
      return "Nicht priorisieren";
  }
}

function buildPitch(category: PartnerLeadCategory, companyName: string): string {
  switch (category) {
    case "systemhaus_it_dienstleister":
      return `Partner-Angle für ${companyName}: NIS2-Nachweise und Audit-Vorbereitung als skalierbares Angebot für Ihre KMU-Kunden — ohne jedes Mal bei null anzufangen.`;
    case "msp":
      return `MSP-Angle für ${companyName}: Wiederkehrende NIS2-Anfragen von Kunden strukturiert beantworten — als ergänzender Service neben M365 und Managed Services.`;
    case "cybersecurity_beratung":
      return `Security-Angle für ${companyName}: Nachweise, Reviews und Audit-Readiness für Kundenprojekte schneller liefern — ohne Feature-Pitch, mit klarem Partnernutzen.`;
    case "datenschutz_beratung":
      return `DSB-Angle für ${companyName}: NIS2- und IT-Security-Nachweise ergänzen, wenn Kunden über Datenschutz hinaus fragen.`;
    case "compliance_nis2_beratung":
      return `Compliance-Angle für ${companyName}: Mandate effizienter umsetzen, wenn Kunden Audit-Readiness und Nachweisstruktur brauchen.`;
    case "cloud_m365_beratung":
      return `Cloud-Angle für ${companyName}: M365-Kunden bei NIS2-Nachweisen und Zugriffssicherheit unterstützen — als logische Erweiterung Ihrer Betreuung.`;
    case "backup_notfallmanagement":
      return `BCM-Angle für ${companyName}: Backup- und Wiederherstellungsnachweise strukturiert dokumentieren — häufig gefragt bei Audits.`;
    case "sonstiger_partner":
      return `Partner-Angle für ${companyName}: Prüfen, ob NIS2-Nachweise für Ihre Kunden ein wiederkehrendes Thema ist — und ob ein Partner-Modell passt.`;
    case "nicht_priorisiert":
      return `Kein aktiver Partner-Pitch empfohlen — Lead zuerst manuell prüfen.`;
  }
}

function buildNextStep(band: PartnerScoreBand, deprioritized: boolean): string {
  if (deprioritized) return "Später prüfen — nicht automatisch in Outreach übernehmen.";
  switch (band) {
    case "excellent":
      return "Kurze Partner-Erstansprache vorbereiten und persönlich kontaktieren.";
    case "good":
      return "Ansprache vorbereiten und nach passendem Anlass kontaktieren.";
    case "review":
      return "Website/Leistungen prüfen, dann entscheiden ob Partner-Outreach sinnvoll ist.";
    case "low":
      return "Nicht priorisieren — nur bei strategischem Bedarf manuell öffnen.";
  }
}

export function scorePartnerLead(input: PartnerLeadInput): PartnerScoreResult {
  const text = buildSearchText(input);
  const industry = (input.industry ?? "").toLowerCase();
  const employees = parseEmployeeCount(input.employee_count);
  const breakdown: string[] = [];
  let score = 0;
  let deprioritized = false;
  let deprioritize_reason: string | null = null;

  const category = classifyPartnerCategory(text);
  if (category === "nicht_priorisiert") {
    breakdown.push("Keine klare Partner-Kategorie erkannt");
  } else {
    breakdown.push(`Kategorie: ${PARTNER_CATEGORY_LABELS[category]}`);
  }

  for (const group of EXCLUSION_GROUPS) {
    if (group.keywords.some((kw) => text.includes(kw) || industry.includes(kw))) {
      score -= group.penalty;
      deprioritized = true;
      deprioritize_reason = `${group.label} — Status: später prüfen`;
      breakdown.push(`Abzug ${group.penalty}: ${group.label}`);
    }
  }

  const isItProvider =
    category === "systemhaus_it_dienstleister" ||
    category === "msp" ||
    text.includes("systemhaus") ||
    text.includes("it-dienstleister") ||
    text.includes("managed service");
  if (isItProvider) {
    score += 25;
    breakdown.push("+25: IT-Dienstleister / Systemhaus / MSP");
  }

  const hasSecurityCompliance =
    category === "cybersecurity_beratung" ||
    category === "datenschutz_beratung" ||
    category === "compliance_nis2_beratung" ||
    ["security", "datenschutz", "compliance", "nis2", "iso 27001"].some((kw) => text.includes(kw));
  if (hasSecurityCompliance) {
    score += 20;
    breakdown.push("+20: IT-Sicherheit / Datenschutz / Compliance / NIS2");
  }

  const servesKmu = KMU_SIGNALS.some((kw) => text.includes(kw)) || isItProvider;
  if (servesKmu) {
    score += 15;
    breakdown.push("+15: Betreut KMU / B2B-Kunden");
  }

  const hasCloudM365 =
    category === "cloud_m365_beratung" ||
    ["microsoft 365", "m365", "cloud", "backup", "managed"].some((kw) => text.includes(kw));
  if (hasCloudM365) {
    score += 15;
    breakdown.push("+15: Microsoft 365 / Cloud / Backup / Managed Services");
  }

  const hasConsulting =
    text.includes("beratung") ||
    text.includes("consulting") ||
    category === "datenschutz_beratung" ||
    category === "compliance_nis2_beratung";
  if (hasConsulting) {
    score += 10;
    breakdown.push("+10: Erkennbare Beratungsleistungen");
  }

  const inDach =
    DACH_REGIONS.some((r) => text.includes(r)) ||
    !input.city ||
    !input.region;
  if (inDach) {
    score += 10;
    breakdown.push("+10: DACH / Deutschland");
  }

  const fastDecision =
    employees != null
      ? employees >= 5 && employees <= 250
      : !text.includes("konzern") && !text.includes("holding");
  if (fastDecision) {
    score += 5;
    breakdown.push("+5: Klein/mittel — wahrscheinlich entscheidungsfähig");
  }

  const hasItContext = PARTNER_SERVICE_KEYWORDS.some((kw) => text.includes(kw));
  if (!hasItContext && category === "nicht_priorisiert") {
    score -= 15;
    breakdown.push("-15: Kein klarer IT-/Security-/Compliance-Bezug");
  }

  if (
    text.includes("verein") &&
    !text.includes("it") &&
    !text.includes("beratung")
  ) {
    score -= 15;
    deprioritized = true;
    deprioritize_reason = "Verein ohne IT-Bezug";
    breakdown.push("-15: Verein ohne IT-Bezug");
  }

  if (
    (text.includes("handwerk") || text.includes("bäckerei") || text.includes("friseur")) &&
    !hasItContext
  ) {
    score -= 15;
    deprioritized = true;
    deprioritize_reason = "Handwerk ohne IT-/Compliance-Kontext";
    breakdown.push("-15: Handwerk ohne erkennbaren IT-Kontext");
  }

  score = Math.max(0, Math.min(100, score));
  const score_band = scoreBand(score);
  const auto_outreach = !deprioritized && score >= 60;

  const score_reason = [
    `${bandLabel(score_band)} (${score}/100)`,
    deprioritize_reason ? deprioritize_reason : null,
    breakdown.slice(0, 4).join(" · "),
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    partner_score: score,
    score_band,
    lead_category: deprioritized && score < 40 ? "nicht_priorisiert" : category,
    score_reason,
    recommended_pitch: buildPitch(category, input.company_name),
    recommended_next_step: buildNextStep(score_band, deprioritized),
    deprioritized,
    deprioritize_reason,
    breakdown,
    auto_outreach,
  };
}

/** Map 0–100 partner score to legacy 0–10 scale for backward-compatible fields */
export function partnerScoreToLegacy(score: number): number {
  return Math.round(score / 10);
}
