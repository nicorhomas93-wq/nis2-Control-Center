import type {
  EvidenceCategory,
  EvidenceEntryType,
  EvidenceMandatoryRelevance,
} from "@/lib/compliance-evidence/types";
import type { Nis2EvidenceScope } from "@/lib/compliance-evidence/types";

export interface EvidenceTemplate {
  key: string;
  title: string;
  category: EvidenceCategory;
  entryType: EvidenceEntryType;
  description: string;
  reviewInterval: "none" | "6m" | "12m" | "24m" | "custom";
  recommendedFiles: string[];
  defaultMandatory: EvidenceMandatoryRelevance;
}

export const EVIDENCE_TEMPLATES: EvidenceTemplate[] = [
  {
    key: "mfa_annual_training",
    title: "Jährliche MFA-Sicherheitsschulung",
    category: "mfa_zugriff",
    entryType: "schulung",
    description: "Jährliche Schulung zur Multi-Faktor-Authentifizierung und Zugriffssicherheit.",
    reviewInterval: "12m",
    recommendedFiles: [
      "Schulungsunterlage",
      "Teilnehmerliste",
      "Teilnahmebestätigungen",
      "Screenshots / Nachweise der MFA-Kontrolle",
    ],
    defaultMandatory: "nis2_dependent",
  },
  {
    key: "phishing_simulation",
    title: "Phishing-Simulation mit Auswertung",
    category: "phishing_awareness",
    entryType: "phishing_auswertung",
    description: "Phishing-Kampagne inklusive Auswertung und Folgemaßnahmen.",
    reviewInterval: "12m",
    recommendedFiles: [
      "Kampagnenbericht",
      "Teilnehmerübersicht",
      "Auswertung",
      "Folgemaßnahmen",
    ],
    defaultMandatory: "nis2_dependent",
  },
  {
    key: "password_access_training",
    title: "Passwort- und Zugangsschutzschulung",
    category: "schulungen",
    entryType: "schulung",
    description: "Schulung zu Passwortrichtlinien und sicherem Zugangsmanagement.",
    reviewInterval: "12m",
    recommendedFiles: ["Schulungsunterlage", "Teilnehmerliste", "Teilnahmebestätigungen"],
    defaultMandatory: "nis2_dependent",
  },
  {
    key: "incident_response_briefing",
    title: "Incident-Response-Unterweisung",
    category: "incident_response",
    entryType: "schulung",
    description: "Unterweisung zum Vorgehen bei Sicherheitsvorfällen.",
    reviewInterval: "12m",
    recommendedFiles: [
      "Unterweisungsunterlage",
      "Teilnehmerliste",
      "Notfallkontaktliste",
      "Eskalationsplan",
    ],
    defaultMandatory: "nis2_dependent",
  },
  {
    key: "backup_restore_test",
    title: "Backup-Wiederherstellungstest",
    category: "backup_wiederherstellung",
    entryType: "backup_nachweis",
    description: "Dokumentierter Test der Backup- und Wiederherstellungsfähigkeit.",
    reviewInterval: "12m",
    recommendedFiles: [
      "Testprotokoll",
      "Ergebnisbericht",
      "Screenshot / Systemnachweis",
      "Verantwortlichenfreigabe",
    ],
    defaultMandatory: "nis2_dependent",
  },
  {
    key: "access_review",
    title: "Berechtigungsprüfung",
    category: "mfa_zugriff",
    entryType: "zugriffskontroll_nachweis",
    description: "Nachweis der regelmäßigen Berechtigungsprüfung.",
    reviewInterval: "6m",
    recommendedFiles: ["Berechtigungsliste", "Freigabeprotokoll", "Änderungsnachweis"],
    defaultMandatory: "nis2_dependent",
  },
  {
    key: "vendor_assessment",
    title: "Lieferantenbewertung",
    category: "lieferanten",
    entryType: "lieferanten_nachweis",
    description: "Nachweis der Lieferanten- und Dienstleisterbewertung.",
    reviewInterval: "12m",
    recommendedFiles: [
      "Lieferantenbewertung",
      "AV-Vertrag",
      "TOMs",
      "ISO-Zertifikat",
      "SLA",
    ],
    defaultMandatory: "nis2_dependent",
  },
  {
    key: "general_security_briefing",
    title: "Allgemeine Sicherheitsunterweisung",
    category: "richtlinien",
    entryType: "schulung",
    description: "Allgemeine Sicherheitsunterweisung für Mitarbeitende.",
    reviewInterval: "12m",
    recommendedFiles: [
      "Unterweisungsunterlage",
      "Mitarbeiterbestätigung",
      "Teilnehmerliste",
    ],
    defaultMandatory: "nis2_dependent",
  },
];

export function getEvidenceTemplate(key: string): EvidenceTemplate | null {
  return EVIDENCE_TEMPLATES.find((t) => t.key === key) ?? null;
}

export function resolveTemplateMandatory(
  template: EvidenceTemplate,
  scope: Nis2EvidenceScope
): EvidenceMandatoryRelevance {
  if (scope === "voluntary") return "no";
  return template.defaultMandatory;
}

export function getTemplateScopeLabel(scope: Nis2EvidenceScope): string {
  if (scope === "voluntary") return "Freiwillig empfohlen";
  if (scope === "mandatory") return "Abhängig vom NIS2-Status";
  return "NIS2-Status unklar";
}
