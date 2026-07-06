import type { ResearchSignalType } from "@/lib/jarvis/lead-research/constants";
import {
  hasJobRoleMarkers,
  hasTenderProcurementMarkers,
  isBlockedMediaSource,
  isGenericNewsContent,
  isTrustedJobSource,
  isTrustedTenderSource,
} from "@/lib/jarvis/lead-research/media-block";

const CONCRETE_DEMAND_PATTERNS = [
  /\bwir (suchen|stellen ein|bieten|führen ein|bauen auf|bereiten uns vor|erweitern|professionalisieren)\b/i,
  /\bstellenanzeige\b/i,
  /\bstellenangebot\b/i,
  /informationssicherheitsbeauftragter/i,
  /\bisb\b/i,
  /it[\s-]*security[\s-]*manager/i,
  /cyber[\s-]*security[\s-]*manager/i,
  /compliance[\s-]*manager/i,
  /iso[\s-]*27001/i,
  /\bisms\b/i,
  /\bciso\b/i,
  /nis2[\s-]*(umsetzung|compliance)/i,
  /isms[\s-]*aufbau/i,
  /bsi[\s-]*grundschutz/i,
  /incident[\s-]*response/i,
  /security awareness/i,
  /notfallmanagement/i,
  /lieferantensicherheit/i,
  /ot[\s-]*security/i,
  /\bdora\b/i,
  /business continuity/i,
  /\bbcm\b/i,
  /it[\s-]*governance/i,
  /it[\s-]*asset[\s-]*management/i,
  /security officer/i,
];

const PARTNER_PATTERNS = [
  /nis2[\s-]*(beratung|consulting|dienstleistung)/i,
  /iso[\s-]*27001[\s-]*(beratung|consulting)/i,
  /isms[\s-]*(beratung|consulting)/i,
  /managed[\s-]*security/i,
  /\bmsp\b/i,
  /it[\s-]*systemhaus/i,
  /datenschutz[\s-]*(beratung|consulting)/i,
  /wir (unterstützen|begleiten) (unsere )?kunden/i,
  /für (unsere )?kunden.*nis2/i,
  /externer informationssicherheitsbeauftragter/i,
];

const KNOWN_PARTNER_ORGANIZATIONS = [
  "bechtle",
  "cancom",
  "datagroup",
  "gisa",
  "adesso",
  "t-systems",
  "msg systems",
  "msg group",
  "itelligence",
  "detecon",
  "norcom",
  "matrix42",
  "controlware",
  "konica minolta",
  "computacenter",
  "softwareone",
  "accenture",
  "deloitte",
  "kpmg",
  "pwc",
  "ey ",
  "ernst & young",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

/** @deprecated Nutze isBlockedMediaSource */
export function isExcludedMediaSource(url: string | null | undefined, companyName: string): boolean {
  return isBlockedMediaSource({ company_name: companyName, source_url: url });
}

export { isGenericNewsContent } from "@/lib/jarvis/lead-research/media-block";

export function hasConcreteDemandSignal(
  text: string,
  signalType: ResearchSignalType,
  sourceUrl?: string | null,
  sourcePlatform?: string | null
): boolean {
  const n = normalize(text);

  if (signalType === "tender") {
    if (isGenericNewsContent(text)) return false;
    if (isTrustedTenderSource(sourceUrl, sourcePlatform) && hasTenderProcurementMarkers(text)) {
      return true;
    }
    return hasTenderProcurementMarkers(text) && CONCRETE_DEMAND_PATTERNS.some((p) => p.test(n));
  }

  if (signalType === "job") {
    if (isGenericNewsContent(text)) return false;
    if (isTrustedJobSource(sourceUrl, sourcePlatform) && hasJobRoleMarkers(text)) return true;
    return hasJobRoleMarkers(text);
  }

  return CONCRETE_DEMAND_PATTERNS.some((p) => p.test(n));
}

/** NIS2-Erwähnung ohne Rollen-, Projekt- oder Ausschreibungsbezug ist kein Lead. */
export function isNis2MentionOnly(
  text: string,
  signalType: ResearchSignalType,
  sourceUrl?: string | null,
  sourcePlatform?: string | null
): boolean {
  const n = normalize(text);
  if (!/\bnis2\b/.test(n)) return false;

  if (signalType === "tender") {
    if (isTrustedTenderSource(sourceUrl, sourcePlatform) && hasTenderProcurementMarkers(text)) {
      return false;
    }
    return true;
  }

  if (signalType === "job") {
    if (isTrustedJobSource(sourceUrl, sourcePlatform) && hasJobRoleMarkers(text)) return false;
    return !hasJobRoleMarkers(text);
  }

  const beyondNis2 = CONCRETE_DEMAND_PATTERNS.filter((p) => !/nis2/.test(p.source)).some((p) =>
    p.test(n)
  );
  return !beyondNis2;
}

export function isPartnerLeadSignal(text: string, industry?: string | null): boolean {
  const combined = normalize(`${text} ${industry ?? ""}`);
  return PARTNER_PATTERNS.some((p) => p.test(combined));
}

export function isKnownPartnerOrganization(
  companyName: string,
  industry?: string | null,
  text?: string
): boolean {
  const combined = normalize(`${companyName} ${industry ?? ""} ${text ?? ""}`);

  if (KNOWN_PARTNER_ORGANIZATIONS.some((name) => combined.includes(name))) return true;

  const partnerIndustry = [
    "it-systemhaus",
    "systemhaus",
    "msp",
    "managed service",
    "it-dienstleister",
    "beratung",
    "consulting",
    "cybersecurity-beratung",
  ];
  const industryNorm = normalize(industry ?? "");
  if (partnerIndustry.some((k) => industryNorm.includes(k))) return true;

  return /it[\s-]*consultant|junior consultant|senior consultant/.test(combined) && /\bnis2\b/.test(combined);
}

export interface QualityCheckInput {
  company_name: string;
  signal_type: ResearchSignalType;
  title?: string | null;
  description?: string | null;
  source_url?: string | null;
  source_platform?: string | null;
  signal_art?: string | null;
}

export function rejectLeadQuality(input: QualityCheckInput): string | null {
  if (isBlockedMediaSource(input)) {
    return "Nachrichtenportal / allgemeiner Artikel — kein Lead";
  }

  const combined = [input.title, input.description, input.company_name].filter(Boolean).join(" ");

  if (isNis2MentionOnly(combined, input.signal_type, input.source_url, input.source_platform)) {
    return "Nur NIS2-Erwähnung ohne konkretes Bedarfssignal";
  }

  if (!hasConcreteDemandSignal(combined, input.signal_type, input.source_url, input.source_platform)) {
    return "Kein konkretes Bedarfssignal erkennbar";
  }

  return null;
}
