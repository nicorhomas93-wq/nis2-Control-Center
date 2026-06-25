import type { DocumentType } from "@/lib/types";

export const DOCUMENT_TYPES: {
  id: DocumentType;
  label: string;
  description: string;
}[] = [
  {
    id: "nis2_betroffenheitsanalyse",
    label: "NIS2-Betroffenheitsanalyse",
    description: "Dokumentierte Einordnung der NIS2-Betroffenheit",
  },
  {
    id: "informationssicherheitsleitlinie",
    label: "Informationssicherheitsleitlinie",
    description: "Übergeordnete Sicherheitsrichtlinie für das Unternehmen",
  },
  {
    id: "risikoanalyse",
    label: "Risikoanalyse",
    description: "Systematische Bewertung von IT-Sicherheitsrisiken",
  },
  {
    id: "massnahmenplan",
    label: "Maßnahmenplan",
    description: "Priorisierte Liste von Sicherheitsmaßnahmen",
  },
  {
    id: "incident_response_plan",
    label: "Incident-Response-Plan",
    description: "Prozess zur Behandlung von Sicherheitsvorfällen",
  },
  {
    id: "backup_konzept",
    label: "Backup-Konzept",
    description: "Strategie für Datensicherung und Wiederherstellung",
  },
  {
    id: "zugriffskonzept",
    label: "Zugriffskonzept",
    description: "Regelungen für Benutzer- und Systemzugriffe",
  },
  {
    id: "lieferantenbewertung",
    label: "Lieferantenbewertung",
    description: "Bewertung von IT-Dienstleistern und Lieferanten",
  },
  {
    id: "meldeprozess",
    label: "Meldeprozess für Sicherheitsvorfälle",
    description: "Ablauf für Meldungen gemäß NIS2",
  },
  {
    id: "management_zusammenfassung",
    label: "Management-Zusammenfassung",
    description: "Kompakte Übersicht für die Geschäftsleitung",
  },
];

export function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPES.find((d) => d.id === type)?.label ?? type;
}
