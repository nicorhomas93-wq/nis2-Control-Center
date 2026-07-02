import type { Company, Document, Measure, Risk } from "@/lib/types";
import type { VendorWithDetails } from "@/lib/vendors/types";
import {
  getVendorApplicability,
  isVendorsMandatory,
  isVendorsNotApplicable,
  isVendorsApplicabilityUnknown,
} from "@/lib/vendors/applicability";
import { isPlaceholderValue, deriveRiskProblemTitle } from "@/lib/compliance/risk-display";
import { isWorkComplete } from "@/lib/compliance/obligations";
import type { TaskItem } from "@/lib/tasks/types";
import { isTaskOpen } from "@/lib/tasks/types";
import { countMissingEvidence, isReviewDue } from "@/lib/vendors/scoring";
import type { ComplianceEvidenceEntryWithFiles } from "@/lib/compliance-evidence/types";
import {
  deriveEntryStatus,
  countMandatoryGaps,
} from "@/lib/compliance-evidence/scoring";
import {
  getNis2EvidenceScope,
  isEntryMandatoryForCompany,
  isNis2StatusUnknown,
} from "@/lib/compliance-evidence/types";

export type DataQualityStatus =
  | "confirmed_with_evidence"
  | "confirmed"
  | "missing"
  | "contradictory";

export interface DataQualityCheck {
  checkKey: string;
  status: DataQualityStatus;
  qualityLevel: "high" | "medium" | "low" | "critical";
  reason: string;
  relatedType?: string;
  relatedId?: string;
}

export interface DataQualityResult {
  percent: number;
  checks: DataQualityCheck[];
  hints: string[];
  auditReadinessCap: number | null;
}

function statusWeight(status: DataQualityStatus): number {
  switch (status) {
    case "confirmed_with_evidence":
      return 100;
    case "confirmed":
      return 70;
    case "missing":
      return 20;
    case "contradictory":
      return 0;
  }
}

export function calculateDataQuality(input: {
  company: Company | null;
  risks: Risk[];
  measures: Measure[];
  documents: Document[];
  tasks?: TaskItem[];
  vendors?: VendorWithDetails[];
  complianceEvidence?: ComplianceEvidenceEntryWithFiles[];
}): DataQualityResult {
  const checks: DataQualityCheck[] = [];
  const hints: string[] = [];

  if (!input.company?.company_name || !input.company.industry) {
    checks.push({
      checkKey: "company_profile",
      status: "missing",
      qualityLevel: "low",
      reason: "Unternehmensprofil unvollständig",
      relatedType: "company",
    });
  } else {
    checks.push({
      checkKey: "company_profile",
      status: "confirmed",
      qualityLevel: "medium",
      reason: "Unternehmensprofil vorhanden",
      relatedType: "company",
    });
  }

  if (!input.company?.nis2_status || input.company.nis2_status === "unbekannt") {
    checks.push({
      checkKey: "nis2_assessment",
      status: "missing",
      qualityLevel: "low",
      reason: "Betroffenheitscheck fehlt",
    });
  } else {
    checks.push({
      checkKey: "nis2_assessment",
      status: "confirmed",
      qualityLevel: "medium",
      reason: "Betroffenheitscheck durchgeführt",
    });
  }

  let unconfirmedRisks = 0;
  let contradictory = 0;
  for (const risk of input.risks) {
    if (isPlaceholderValue(risk.business_impact) || isPlaceholderValue(risk.responsible)) {
      unconfirmedRisks += 1;
      checks.push({
        checkKey: `risk-${risk.id}`,
        status: "missing",
        qualityLevel: "low",
        reason: `Risiko „${deriveRiskProblemTitle(risk)}" unvollständig`,
        relatedType: "risk",
        relatedId: risk.id,
      });
    }
    if (
      risk.risk_level === "low" &&
      (risk.criticality === "high" || risk.criticality === "critical")
    ) {
      contradictory += 1;
      checks.push({
        checkKey: `risk-contradiction-${risk.id}`,
        status: "contradictory",
        qualityLevel: "critical",
        reason: `Widersprüchliche Bewertung bei „${deriveRiskProblemTitle(risk)}"`,
        relatedType: "risk",
        relatedId: risk.id,
      });
    }
  }

  let missingEvidenceMeasures = 0;
  for (const measure of input.measures) {
    if (measure.is_mandatory && !isWorkComplete(measure.status)) {
      missingEvidenceMeasures += 1;
    }
  }

  const openEvidenceTasks =
    input.tasks?.filter(
      (t) => t.evidence_required && isTaskOpen(t.status) && t.status === "waiting_evidence"
    ).length ?? 0;

  const vendors = input.vendors ?? [];
  const applicability = getVendorApplicability(input.company);
  let vendorMissingEvidence = 0;
  let vendorReviewsDue = 0;
  let auditReadinessCapFromVendors: number | null = null;

  if (isVendorsNotApplicable(input.company)) {
    checks.push({
      checkKey: "vendor_inventory",
      status: "confirmed_with_evidence",
      qualityLevel: "high",
      reason: "Lieferantenbewertung nicht zutreffend (N/A)",
      relatedType: "vendor",
    });
  } else if (isVendorsApplicabilityUnknown(input.company)) {
    checks.push({
      checkKey: "vendor_applicability",
      status: "missing",
      qualityLevel: "medium",
      reason: "Relevanz von Lieferanten unbekannt",
      relatedType: "vendor",
    });
    hints.push(
      "Bitte angeben, ob relevante Lieferanten/Dienstleister vorhanden sind (Ja/Nein)."
    );
    auditReadinessCapFromVendors = 80;
  } else if (isVendorsMandatory(input.company) && vendors.length === 0) {
    checks.push({
      checkKey: "vendor_inventory",
      status: "missing",
      qualityLevel: "high",
      reason: "Keine Lieferanten erfasst (erforderlich)",
      relatedType: "vendor",
    });
    hints.push("Lieferanteninventar fehlt für Audit-Ordner 08.");
  } else if (vendors.length > 0) {
    checks.push({
      checkKey: "vendor_inventory",
      status: "confirmed",
      qualityLevel: "medium",
      reason: `${vendors.length} Lieferant${vendors.length === 1 ? "" : "en"} erfasst`,
      relatedType: "vendor",
    });

    for (const vendor of vendors) {
      const missing = countMissingEvidence(
        vendor.evidence,
        vendor.criticality,
        vendor.provider_key
      );
      if (missing > 0) {
        vendorMissingEvidence += missing;
        checks.push({
          checkKey: `vendor-evidence-${vendor.id}`,
          status: "missing",
          qualityLevel: vendor.criticality === "critical" || vendor.criticality === "high" ? "high" : "medium",
          reason: `Lieferant „${vendor.name}": ${missing} fehlende Nachweise`,
          relatedType: "vendor",
          relatedId: vendor.id,
        });
      }
      if (isReviewDue(vendor.next_review_at)) {
        vendorReviewsDue += 1;
        checks.push({
          checkKey: `vendor-review-${vendor.id}`,
          status: "missing",
          qualityLevel: "medium",
          reason: `Lieferantenbewertung fällig: ${vendor.name}`,
          relatedType: "vendor",
          relatedId: vendor.id,
        });
      }
    }
  }

  if (vendorMissingEvidence > 0) {
    hints.push(
      `${vendorMissingEvidence} Lieferanten-Nachweis${vendorMissingEvidence === 1 ? "" : "e"} fehlen.`
    );
  }
  if (vendorReviewsDue > 0) {
    hints.push(
      `${vendorReviewsDue} Lieferantenbewertung${vendorReviewsDue === 1 ? "" : "en"} fällig.`
    );
  }

  if (vendorReviewsDue > 0) {
    hints.push(
      `${vendorReviewsDue} Lieferantenbewertung${vendorReviewsDue === 1 ? "" : "en"} fällig.`
    );
  }

  const evidenceScope = getNis2EvidenceScope(input.company);
  const complianceEntries = input.complianceEvidence ?? [];

  if (isNis2StatusUnknown(input.company?.nis2_status)) {
    checks.push({
      checkKey: "nis2_evidence_scope",
      status: "missing",
      qualityLevel: "medium",
      reason: "NIS2-Betroffenheit nicht geklärt — Schulungsnachweise unklar",
    });
    hints.push("Bitte NIS2-Betroffenheit klären (Betroffenheitscheck).");
  } else if (evidenceScope === "voluntary") {
    checks.push({
      checkKey: "compliance_evidence_voluntary",
      status: "confirmed",
      qualityLevel: "low",
      reason: "Schulungen & Nachweise — freiwillig empfohlen",
    });
  }

  if (evidenceScope === "mandatory") {
    const mandatoryGaps = countMandatoryGaps(complianceEntries, input.company);
    if (mandatoryGaps > 0) {
      checks.push({
        checkKey: "compliance_evidence_gaps",
        status: "missing",
        qualityLevel: mandatoryGaps >= 3 ? "high" : "medium",
        reason: `${mandatoryGaps} fehlende oder abgelaufene Schulungs-/Nachweis-Einträge`,
      });
      hints.push(
        `${mandatoryGaps} Pflichtnachweis${mandatoryGaps === 1 ? "" : "e"} im Modul Schulungen & Nachweise fehlen.`
      );
    } else if (complianceEntries.length > 0) {
      checks.push({
        checkKey: "compliance_evidence",
        status: "confirmed_with_evidence",
        qualityLevel: "medium",
        reason: `${complianceEntries.length} Nachweis-Einträge dokumentiert`,
      });
    }

    for (const entry of complianceEntries) {
      if (!isEntryMandatoryForCompany(entry, input.company)) continue;
      const status = deriveEntryStatus(entry, entry.files, input.company);
      if (status === "abgelaufen" || status === "review_faellig") {
        checks.push({
          checkKey: `compliance-evidence-${entry.id}`,
          status: "missing",
          qualityLevel: "medium",
          reason: `${entry.title}: ${status === "abgelaufen" ? "abgelaufen" : "Review fällig"}`,
          relatedType: "compliance_evidence",
          relatedId: entry.id,
        });
      }
    }
  }

  if (unconfirmedRisks > 0) {
    hints.push(
      `Bewertung basiert auf ${unconfirmedRisks} unbestätigten Angabe${unconfirmedRisks === 1 ? "" : "n"}.`
    );
  }
  if (missingEvidenceMeasures + openEvidenceTasks > 0) {
    const n = missingEvidenceMeasures + openEvidenceTasks;
    hints.push(`${n} wichtige Nachweis${n === 1 ? "" : "e"} fehlen.`);
  }
  if (contradictory > 0) {
    hints.push(
      `${contradictory} Angabe${contradictory === 1 ? "" : "n"} ${contradictory === 1 ? "ist" : "sind"} widersprüchlich.`
    );
  }

  if (checks.length === 0) {
    return { percent: 100, checks, hints, auditReadinessCap: null };
  }

  const sum = checks.reduce((acc, c) => acc + statusWeight(c.status), 0);
  const percent = Math.round(sum / checks.length);

  let auditReadinessCap: number | null = auditReadinessCapFromVendors;
  if (percent < 50) auditReadinessCap = Math.min(auditReadinessCap ?? 100, 60);
  else if (percent < 70) {
    auditReadinessCap =
      auditReadinessCap === null ? 80 : Math.min(auditReadinessCap, 80);
  }

  return { percent, checks, hints, auditReadinessCap };
}

export function applyDataQualityCap(auditPercent: number, dataQuality: DataQualityResult): number {
  if (dataQuality.auditReadinessCap === null) return auditPercent;
  return Math.min(auditPercent, dataQuality.auditReadinessCap);
}
