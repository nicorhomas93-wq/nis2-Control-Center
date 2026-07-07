import type { CsvImportType } from "@/lib/integrations/types";

export type WizardSystemKey =
  | "microsoft365"
  | "jira"
  | "sap"
  | "servicenow"
  | "csv_excel"
  | "api_webhooks";

export interface WizardSystemCard {
  key: WizardSystemKey;
  providerKey: string;
  title: string;
  description: string;
  buttonLabel: string;
  badge?: string;
}

export const WIZARD_SYSTEMS: WizardSystemCard[] = [
  {
    key: "microsoft365",
    providerKey: "microsoft365",
    title: "Microsoft 365",
    description: "Benutzer, Gruppen, SharePoint-Dokumente, Teams und Outlook anbinden.",
    buttonLabel: "Microsoft 365 verbinden",
    badge: "Empfohlen",
  },
  {
    key: "jira",
    providerKey: "jira",
    title: "Jira",
    description: "Maßnahmen und Sicherheitsvorfälle als Tickets synchronisieren.",
    buttonLabel: "Jira verbinden",
  },
  {
    key: "sap",
    providerKey: "sap",
    title: "SAP",
    description: "Lieferanten, Standorte, Organisationseinheiten und Geschäftsprozesse übernehmen.",
    buttonLabel: "SAP vorbereiten",
    badge: "Enterprise",
  },
  {
    key: "servicenow",
    providerKey: "servicenow",
    title: "ServiceNow",
    description: "ITSM-, Incident- und GRC-Prozesse verbinden.",
    buttonLabel: "ServiceNow vorbereiten",
  },
  {
    key: "csv_excel",
    providerKey: "csv_excel",
    title: "CSV / Excel",
    description: "Lieferanten, Benutzer, Risiken oder Maßnahmen per Datei importieren.",
    buttonLabel: "Datei importieren",
    badge: "Sofort nutzbar",
  },
  {
    key: "api_webhooks",
    providerKey: "webhooks",
    title: "API & Webhooks",
    description: "TKND technisch mit anderen Systemen verbinden.",
    buttonLabel: "Entwickleroptionen öffnen",
    badge: "Für IT-Admins",
  },
];

export const WIZARD_GOALS: Record<WizardSystemKey, { id: string; label: string }[]> = {
  microsoft365: [
    { id: "users", label: "Benutzer übernehmen" },
    { id: "departments", label: "Abteilungen übernehmen" },
    { id: "responsibles", label: "Verantwortliche importieren" },
    { id: "sharepoint", label: "SharePoint-Dokumente als Nachweise verknüpfen" },
    { id: "teams", label: "Teams-Benachrichtigungen aktivieren" },
    { id: "outlook", label: "Berichte per Outlook versenden" },
  ],
  jira: [
    { id: "measures", label: "TKND-Maßnahmen als Jira-Tickets erstellen" },
    { id: "incidents", label: "Sicherheitsvorfälle als Jira-Tickets erstellen" },
    { id: "status_sync", label: "Ticketstatus zurück nach TKND synchronisieren" },
    { id: "owners", label: "Verantwortliche und Fristen übernehmen" },
  ],
  sap: [
    { id: "suppliers", label: "Lieferanten übernehmen" },
    { id: "org_units", label: "Organisationseinheiten übernehmen" },
    { id: "locations", label: "Standorte übernehmen" },
    { id: "processes", label: "Geschäftsprozesse übernehmen" },
    { id: "assets", label: "Asset- oder Systemdaten übernehmen" },
  ],
  servicenow: [
    { id: "incidents", label: "Incidents synchronisieren" },
    { id: "tasks", label: "Tasks synchronisieren" },
    { id: "grc", label: "GRC Controls verbinden" },
    { id: "changes", label: "Change Requests übernehmen" },
  ],
  csv_excel: [
    { id: "suppliers", label: "Lieferanten importieren" },
    { id: "users", label: "Benutzer importieren" },
    { id: "departments", label: "Abteilungen importieren" },
    { id: "risks", label: "Risiken importieren" },
    { id: "measures", label: "Maßnahmen importieren" },
    { id: "evidence", label: "Nachweise importieren" },
    { id: "assets", label: "Assets importieren" },
  ],
  api_webhooks: [
    { id: "rest_api", label: "REST-API für externe Systeme nutzen" },
    { id: "webhooks_out", label: "Ereignisse per Webhook versenden" },
    { id: "custom_sync", label: "Individuelle Synchronisation vorbereiten" },
  ],
};

export const CSV_GOAL_TO_TYPE: Record<string, CsvImportType> = {
  suppliers: "suppliers",
  users: "users",
  departments: "departments",
  risks: "risks",
  measures: "measures",
  evidence: "evidence",
  assets: "assets",
};

export const CSV_TYPE_LABELS: Record<CsvImportType, string> = {
  suppliers: "Lieferantenname",
  users: "Benutzername",
  departments: "Abteilungsname",
  assets: "Asset-Name",
  risks: "Risikobezeichnung",
  measures: "Maßnahmentitel",
  evidence: "Nachweistitel",
};

export const SAP_SYSTEM_OPTIONS = [
  "SAP S/4HANA",
  "SAP ERP",
  "SAP Ariba",
  "SAP SuccessFactors",
  "SAP GRC",
  "Nicht sicher",
] as const;

export const SAP_SETUP_BY_OPTIONS = [
  "Interne IT",
  "Externer Dienstleister",
  "TKND / Berater",
  "Noch offen",
] as const;

export const WIZARD_STEP_LABELS = [
  "System wählen",
  "Ziel wählen",
  "Verbindung starten",
  "Ergebnis anzeigen",
] as const;
