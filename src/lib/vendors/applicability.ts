import type { Company } from "@/lib/types";
import type { VendorApplicability } from "@/lib/vendors/types";
import type { AuditFolderQuality } from "@/lib/audit/audit-folder-quality";

export const VENDOR_APPLICABILITY_QUESTION =
  "Verfügt Ihr Unternehmen über relevante externe Dienstleister oder Lieferanten für IT, Cloud, Hosting oder kritische Geschäftsprozesse?";

export const VENDOR_APPLICABILITY_LABELS: Record<VendorApplicability, string> = {
  yes: "Ja",
  no: "Nein",
  unknown: "Unbekannt",
};

export function getVendorApplicability(
  company: Pick<Company, "vendors_applicability"> | null | undefined
): VendorApplicability {
  const value = company?.vendors_applicability;
  if (value === "yes" || value === "no" || value === "unknown") return value;
  return "unknown";
}

export function isVendorsNotApplicable(
  company: Pick<Company, "vendors_applicability"> | null | undefined
): boolean {
  return getVendorApplicability(company) === "no";
}

export function isVendorsMandatory(
  company: Pick<Company, "vendors_applicability"> | null | undefined
): boolean {
  return getVendorApplicability(company) === "yes";
}

export function isVendorsApplicabilityUnknown(
  company: Pick<Company, "vendors_applicability"> | null | undefined
): boolean {
  return getVendorApplicability(company) === "unknown";
}

export function getVendorAuditNaQuality(
  company?: Pick<Company, "security_contact_name"> | null
): AuditFolderQuality {
  return {
    status: "not_applicable",
    scorePercent: 100,
    issues: [],
    responsible: company?.security_contact_name?.trim() || null,
    lastUpdated: null,
    nextReview: null,
    hasContent: true,
    hasEvidence: true,
  };
}

export function buildVendorNaAuditDocumentContent(companyName: string): string {
  return [
    `# Lieferantenbewertung – ${companyName}`,
    "",
    "**Status: Nicht zutreffend (N/A)**",
    "",
    VENDOR_APPLICABILITY_QUESTION,
    "",
    `**Antwort:** ${VENDOR_APPLICABILITY_LABELS.no}`,
    "",
    "Das Unternehmen verfügt nach eigener Einschätzung über keine relevanten Lieferanten oder",
    "externen Dienstleister im Bereich Informationssicherheit, IT-Betrieb oder kritische",
    "Geschäftsprozesse. Die Lieferantenbewertung ist daher nicht anwendbar.",
    "",
    "Dieser Audit-Bereich (08_Lieferantenbewertung) gilt als bewertet und wird nicht als",
    "Compliance-Lücke gewertet.",
    "",
    "_Automatisch erzeugt aus dem Lieferantenmodul (N/A)._",
  ].join("\n");
}
