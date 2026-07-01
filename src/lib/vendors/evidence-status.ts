import type { VendorEvidenceStatus } from "@/lib/vendors/types";

export const VENDOR_EVIDENCE_STATUS_LABELS: Record<VendorEvidenceStatus, string> = {
  fulfilled: "Erfüllt",
  not_fulfilled: "Nicht erfüllt",
  in_progress: "In Bearbeitung",
  not_applicable: "Nicht zutreffend (N/A)",
};

/** Legacy-Status aus älteren Datensätzen normalisieren. */
export function normalizeEvidenceStatus(status: string): VendorEvidenceStatus {
  switch (status) {
    case "fulfilled":
    case "present":
      return "fulfilled";
    case "not_fulfilled":
    case "missing":
    case "expired":
      return "not_fulfilled";
    case "in_progress":
    case "review_due":
      return "in_progress";
    case "not_applicable":
      return "not_applicable";
    default:
      return "not_fulfilled";
  }
}
