import type { IncidentActionItem } from "@/lib/incidents/types";

function createAction(title: string): IncidentActionItem {
  return {
    id: crypto.randomUUID(),
    title,
    description: "",
    responsible: "",
    deadline: null,
    status: "open",
    evidence: "",
  };
}

export const CONTAINMENT_ACTION_TITLES = [
  "Zugriff gesperrt",
  "Passwörter/Keys zurückgesetzt",
  "Sessions beendet",
  "Datenabfluss geprüft",
  "Logs gesichert",
  "Verantwortliche informiert",
  "Führungsebene informiert",
  "Datenschutzbeauftragter informiert",
  "Externe Stellen geprüft",
];

export const CORRECTIVE_ACTION_TITLES = [
  "Benutzerrechte geprüft",
  "Austrittsprozess angepasst",
  "Berechtigungsreview durchgeführt",
  "M365/Supabase/SaaS-Zugänge geprüft",
  "Backup-/Exportrechte eingeschränkt",
  "Logging verbessert",
];

export const PREVENTIVE_ACTION_TITLES = [
  "Awareness-Schulung durchgeführt",
  "Richtlinien aktualisiert",
  "Monitoring/Alerting verbessert",
  "Zugriffskonzept nachgeschärft",
  "Lieferanten-/Dienstleisterzugriffe geprüft",
  "Wiederkehrende Kontrolle eingeplant",
];

export function createActionsFromTitles(titles: string[]): IncidentActionItem[] {
  return titles.map(createAction);
}
