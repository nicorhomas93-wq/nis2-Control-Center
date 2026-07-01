import type { VendorQuestionnaireAnswers } from "@/lib/vendors/types";

export interface VendorQuestionnaireQuestion {
  key: keyof VendorQuestionnaireAnswers;
  label: string;
  help?: string;
}

export const VENDOR_QUESTIONNAIRE: VendorQuestionnaireQuestion[] = [
  {
    key: "iso_27001",
    label: "ISO 27001 vorhanden?",
    help: "Zertifizierung oder gleichwertiger Nachweis eines ISMS.",
  },
  {
    key: "processes_personal_data",
    label: "Verarbeitet personenbezogene Daten?",
    help: "AV-Vertrag und TOMs sind dann besonders relevant.",
  },
  {
    key: "notfallkonzept",
    label: "Notfallkonzept vorhanden?",
    help: "BCM/Notfallplan des Lieferanten für Ausfallszenarien.",
  },
  {
    key: "info_security_policy",
    label: "Informationssicherheitsrichtlinie vorhanden?",
    help: "Dokumentierte Sicherheitsgrundsätze des Lieferanten.",
  },
  {
    key: "security_incidents_12m",
    label: "Sicherheitsvorfälle in den letzten 12 Monaten?",
    help: "Meldepflichtige oder relevante Vorfälle beim Lieferanten.",
  },
];

export const QUESTIONNAIRE_ANSWER_LABELS = {
  yes: "Ja",
  no: "Nein",
  unknown: "Unbekannt",
} as const;
