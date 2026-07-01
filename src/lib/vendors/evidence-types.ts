import type { VendorEvidenceType } from "@/lib/vendors/types";
import { getRecommendedEvidenceTypes } from "@/lib/vendors/provider-catalog";

export { VENDOR_EVIDENCE_STATUS_LABELS, normalizeEvidenceStatus } from "@/lib/vendors/evidence-status";

export const VENDOR_EVIDENCE_TYPES: VendorEvidenceType[] = [
  "iso_27001",
  "tisax",
  "datenschutzvereinbarung",
  "av_vertrag",
  "toms",
  "sla",
  "notfallkonzept",
  "versicherungsnachweis",
  "selbstauskunft",
  "other",
];

export const VENDOR_EVIDENCE_LABELS: Record<VendorEvidenceType, string> = {
  iso_27001: "ISO 27001",
  tisax: "TISAX",
  datenschutzvereinbarung: "Datenschutzvereinbarung",
  av_vertrag: "AV-Vertrag",
  toms: "TOMs",
  sla: "SLA",
  notfallkonzept: "Notfallkonzept",
  versicherungsnachweis: "Versicherungsnachweis",
  selbstauskunft: "Selbstauskunft",
  other: "Sonstige Nachweise",
};

export const VENDOR_EVIDENCE_STATUS_OPTIONS = [
  "fulfilled",
  "not_fulfilled",
  "in_progress",
  "not_applicable",
] as const;

export const VENDOR_CRITICALITY_LABELS = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
} as const;

export const VENDOR_RISK_LABELS = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
} as const;

export const VENDOR_EVIDENCE_STATUS_BADGE: Record<string, string> = {
  fulfilled: "bg-emerald-100 text-emerald-800",
  not_fulfilled: "bg-red-100 text-red-800",
  in_progress: "bg-amber-100 text-amber-800",
  not_applicable: "bg-slate-100 text-slate-700",
  present: "bg-emerald-100 text-emerald-800",
  missing: "bg-red-100 text-red-800",
  expired: "bg-red-100 text-red-800",
  review_due: "bg-amber-100 text-amber-800",
};

export const VENDOR_RISK_BADGE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

/** Nachweistypen, die bei hoher/kritischer Kritikalität erwartet werden. */
export function requiredEvidenceForCriticality(
  criticality: string
): VendorEvidenceType[] {
  const base: VendorEvidenceType[] = [
    "datenschutzvereinbarung",
    "av_vertrag",
    "selbstauskunft",
  ];
  if (criticality === "low") return ["selbstauskunft"];
  if (criticality === "medium") return base;
  return [
    ...base,
    "iso_27001",
    "toms",
    "sla",
    "notfallkonzept",
    "versicherungsnachweis",
  ];
}

/** Pflichtnachweise: Kritikalität + provider-spezifische Empfehlungen. */
export function requiredEvidenceForVendor(
  criticality: string,
  providerKey?: string | null
): VendorEvidenceType[] {
  const byCriticality = requiredEvidenceForCriticality(criticality);
  const byProvider = getRecommendedEvidenceTypes(providerKey);
  if (byProvider.length === 0) return byCriticality;
  return [...new Set([...byProvider, ...byCriticality])];
}
