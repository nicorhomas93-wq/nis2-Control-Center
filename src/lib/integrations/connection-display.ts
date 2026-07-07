export type ConnectionDisplayStatus =
  | "prepared"
  | "connected"
  | "syncing"
  | "synced"
  | "error"
  | "expired"
  | "disabled"
  | "demo"
  | "manual_required";

export const CONNECTION_STATUS_LABELS: Record<ConnectionDisplayStatus, string> = {
  prepared: "Vorbereitet",
  connected: "Verbunden",
  syncing: "Synchronisierung läuft",
  synced: "Synchronisiert",
  error: "Fehler",
  expired: "Verbindung abgelaufen",
  disabled: "Deaktiviert",
  demo: "Demo-Modus",
  manual_required: "IT-Einrichtung nötig",
};

export const CONNECTION_STATUS_HINTS: Record<ConnectionDisplayStatus, string> = {
  prepared:
    "Die Verbindung wurde angelegt. Als nächstes kann die Verbindung geprüft oder die Einrichtung abgeschlossen werden.",
  connected: "Die Verbindung ist aktiv und kann Daten mit TKND austauschen.",
  syncing: "TKND überträgt gerade Daten mit dem verbundenen System.",
  synced: "Die letzte Synchronisation war erfolgreich. Daten stehen in TKND bereit.",
  error:
    "Die letzte Verbindung oder Synchronisation ist fehlgeschlagen. Details finden Sie im Fehlerprotokoll.",
  expired: "Die Anmeldung oder das Zertifikat ist abgelaufen. Bitte verbinden Sie das System erneut.",
  disabled: "Diese Integration ist deaktiviert und führt derzeit keine Synchronisationen aus.",
  demo: "Die Verbindung läuft im Demo-Modus mit Beispieldaten.",
  manual_required:
    "Für die vollständige Einrichtung ist noch ein Schritt durch Ihre IT oder einen Administrator nötig.",
};

export type ConnectionAction =
  | "test_connection"
  | "sync"
  | "import_users"
  | "import_departments"
  | "check_sharepoint"
  | "create_test_ticket"
  | "sync_measures"
  | "open_sap_checklist"
  | "prepare_sap_setup"
  | "create_test_incident"
  | "sync_incidents"
  | "import_file"
  | "show_import_history"
  | "manage_api_keys"
  | "create_webhook"
  | "open_docs"
  | "open_mapping"
  | "open_settings"
  | "open_sync_log"
  | "open_error_log"
  | "start_microsoft_signin"
  | "primary_next";

export interface ConnectionActionButton {
  id: ConnectionAction;
  label: string;
  variant: "primary" | "secondary" | "ghost";
}

export interface ConnectionCardViewModel {
  id: string;
  name: string;
  providerKey: string;
  providerName: string;
  typeLabel: string;
  description: string;
  status: ConnectionDisplayStatus;
  statusLabel: string;
  statusHint: string;
  statusBadgeClass: string;
  systemAddress: string | null;
  lastSyncLabel: string;
  discoveredData: { label: string; value: string | number }[];
  nextActionLabel: string;
  nextAction: ConnectionAction;
  primaryAction: ConnectionActionButton;
  secondaryActions: ConnectionActionButton[];
  settingsAction: ConnectionActionButton;
}

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  microsoft365: "Microsoft 365 · Benutzer, Gruppen, SharePoint, Teams",
  jira: "Jira · Maßnahmen, Sicherheitsvorfälle, Ticketstatus",
  sap: "SAP · Lieferanten, Standorte, Organisationseinheiten",
  servicenow: "ServiceNow · Incidents, Tasks, GRC Controls",
  csv_excel: "CSV / Excel · Dateiimport",
  webhooks: "API & Webhooks · REST-Schnittstellen",
  rest_api: "REST API · Technische Anbindung",
};

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  microsoft365:
    "Benutzer, Abteilungen, SharePoint-Dokumente, Teams-Benachrichtigungen und Outlook-Berichte anbinden.",
  jira: "TKND-Maßnahmen und Sicherheitsvorfälle als Jira-Tickets synchronisieren.",
  sap: "Lieferanten, Standorte, Organisationseinheiten und Geschäftsprozesse strukturiert übernehmen.",
  servicenow: "ITSM-, Incident- und GRC-Prozesse mit TKND verbinden.",
  csv_excel: "Lieferanten, Benutzer, Risiken oder Maßnahmen per Datei importieren.",
  webhooks: "TKND technisch mit anderen Systemen über Webhooks verbinden.",
  rest_api: "REST-API für individuelle Systemanbindungen nutzen.",
};

function providerFromConnection(connection: Record<string, unknown>) {
  const provider = connection.integration_providers as
    | { name?: string; key?: string }
    | undefined;
  return {
    key: String(provider?.key ?? "unknown"),
    name: String(provider?.name ?? "Integration"),
  };
}

function configFromConnection(connection: Record<string, unknown>): Record<string, unknown> {
  const raw = connection.config_json;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function hasSyncForConnection(
  connectionId: string,
  syncRuns: Record<string, unknown>[]
): boolean {
  return syncRuns.some(
    (run) =>
      String(run.connection_id ?? "") === connectionId &&
      ["success", "partial"].includes(String(run.status))
  );
}

function isSyncRunning(connectionId: string, syncRuns: Record<string, unknown>[]): boolean {
  return syncRuns.some(
    (run) =>
      String(run.connection_id ?? "") === connectionId &&
      ["queued", "running"].includes(String(run.status))
  );
}

export function resolveConnectionDisplayStatus(
  connection: Record<string, unknown>,
  syncRuns: Record<string, unknown>[]
): ConnectionDisplayStatus {
  const id = String(connection.id);
  const rawStatus = String(connection.status ?? "prepared");
  const config = configFromConnection(connection);
  const hasError = Boolean(connection.last_error);
  const hasSynced = Boolean(connection.last_sync_at) || hasSyncForConnection(id, syncRuns);

  if (isSyncRunning(id, syncRuns)) return "syncing";
  if (rawStatus === "disabled") return "disabled";
  if (hasError || rawStatus === "error") return "error";
  if (config.demo === true || config.mode === "demo") return "demo";
  if (config.manualRequired === true || config.authMethod === "later") return "manual_required";
  if (config.expired === true) return "expired";
  if (rawStatus === "active" && hasSynced) return "synced";
  if (rawStatus === "active") return "connected";
  return "prepared";
}

function formatLastSync(
  connection: Record<string, unknown>,
  syncRuns: Record<string, unknown>[]
): string {
  const connectionId = String(connection.id);
  const latestRun = syncRuns.find((run) => String(run.connection_id ?? "") === connectionId);
  const timestamp = connection.last_sync_at ?? latestRun?.finished_at ?? latestRun?.started_at;
  if (!timestamp) return "Noch nie synchronisiert";
  return new Date(String(timestamp)).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function discoveredDataFromConnection(connection: Record<string, unknown>): { label: string; value: string | number }[] {
  const config = configFromConnection(connection);
  const discovery = config.discovery as Record<string, unknown> | undefined;
  const items: { label: string; value: string | number }[] = [];

  const users = discovery?.users ?? config.discoveredUsers;
  const departments = discovery?.departments ?? config.discoveredDepartments;
  const sharepoint = discovery?.sharepoint ?? config.discoveredSharepointLibraries;

  if (users) items.push({ label: "Benutzer", value: Number(users) });
  if (departments) items.push({ label: "Abteilungen", value: Number(departments) });
  if (sharepoint) items.push({ label: "SharePoint-Bibliotheken", value: Number(sharepoint) });

  if (items.length === 0 && Array.isArray(config.goals) && config.goals.length > 0) {
    items.push({ label: "Geplante Bereiche", value: (config.goals as string[]).length });
  }

  return items;
}

function getNextAction(
  providerKey: string,
  status: ConnectionDisplayStatus,
  hasSynced: boolean
): { label: string; action: ConnectionAction } {
  if (status === "error") {
    return { label: "Fehlerdetails prüfen", action: "open_error_log" };
  }
  if (status === "synced") {
    return { label: "Synchronisationsprotokoll ansehen", action: "open_sync_log" };
  }
  if (status === "syncing") {
    return { label: "Synchronisation läuft", action: "open_sync_log" };
  }
  if (providerKey === "microsoft365" && status === "prepared") {
    return {
      label: "Microsoft-Anmeldung starten oder Verbindung prüfen",
      action: "start_microsoft_signin",
    };
  }
  if (providerKey === "sap" && status === "prepared") {
    return { label: "SAP-Checkliste erstellen", action: "open_sap_checklist" };
  }
  if (providerKey === "csv_excel") {
    return { label: "Datei importieren", action: "import_file" };
  }
  if (status === "connected" && !hasSynced) {
    return { label: "Erste Synchronisation starten", action: "sync" };
  }
  if (status === "prepared" || status === "manual_required") {
    return { label: "Verbindung prüfen", action: "test_connection" };
  }
  return { label: "Synchronisieren", action: "sync" };
}

function providerButtons(
  providerKey: string,
  status: ConnectionDisplayStatus,
  nextAction: ConnectionAction
): {
  primary: ConnectionActionButton;
  secondary: ConnectionActionButton[];
  settings: ConnectionActionButton;
} {
  const settings: ConnectionActionButton = {
    id: "open_settings",
    label: "Einstellungen",
    variant: "ghost",
  };

  if (providerKey === "microsoft365") {
    const secondary: ConnectionActionButton[] = [
      { id: "import_users", label: "Benutzer importieren", variant: "secondary" },
      { id: "import_departments", label: "Abteilungen importieren", variant: "secondary" },
      { id: "check_sharepoint", label: "SharePoint prüfen", variant: "secondary" },
    ];
    if (status === "prepared" || status === "manual_required") {
      return {
        primary: {
          id: nextAction === "start_microsoft_signin" ? "start_microsoft_signin" : "test_connection",
          label: "Microsoft-Verbindung prüfen",
          variant: "primary",
        },
        secondary: [
          { id: "start_microsoft_signin", label: "Microsoft-Anmeldung starten", variant: "secondary" },
          ...secondary.slice(0, 1),
        ],
        settings,
      };
    }
    return {
      primary: { id: "test_connection", label: "Microsoft-Verbindung prüfen", variant: "primary" },
      secondary,
      settings,
    };
  }

  if (providerKey === "jira") {
    return {
      primary: { id: "test_connection", label: "Jira-Verbindung prüfen", variant: "primary" },
      secondary: [
        { id: "create_test_ticket", label: "Test-Ticket erstellen", variant: "secondary" },
        { id: "sync_measures", label: "Maßnahmen synchronisieren", variant: "secondary" },
      ],
      settings,
    };
  }

  if (providerKey === "sap") {
    return {
      primary: { id: "open_sap_checklist", label: "SAP-Checkliste öffnen", variant: "primary" },
      secondary: [
        { id: "prepare_sap_setup", label: "Technische Einrichtung vorbereiten", variant: "secondary" },
        { id: "open_mapping", label: "Mapping bearbeiten", variant: "secondary" },
      ],
      settings,
    };
  }

  if (providerKey === "servicenow") {
    return {
      primary: { id: "test_connection", label: "ServiceNow-Verbindung prüfen", variant: "primary" },
      secondary: [
        { id: "create_test_incident", label: "Test-Incident erstellen", variant: "secondary" },
        { id: "sync_incidents", label: "Incidents synchronisieren", variant: "secondary" },
      ],
      settings,
    };
  }

  if (providerKey === "csv_excel") {
    return {
      primary: { id: "import_file", label: "Datei importieren", variant: "primary" },
      secondary: [
        { id: "show_import_history", label: "Importverlauf anzeigen", variant: "secondary" },
        { id: "open_mapping", label: "Mapping bearbeiten", variant: "secondary" },
      ],
      settings: { id: "open_settings", label: "Einstellungen", variant: "ghost" },
    };
  }

  if (providerKey === "webhooks" || providerKey === "rest_api") {
    return {
      primary: { id: "manage_api_keys", label: "API-Key verwalten", variant: "primary" },
      secondary: [
        { id: "create_webhook", label: "Webhook erstellen", variant: "secondary" },
        { id: "open_docs", label: "Dokumentation öffnen", variant: "secondary" },
      ],
      settings,
    };
  }

  return {
    primary: {
      id: nextAction,
      label: getNextAction(providerKey, status, false).label,
      variant: "primary",
    },
    secondary: [{ id: "sync", label: "Synchronisieren", variant: "secondary" }],
    settings,
  };
}

export function statusBadgeClass(status: ConnectionDisplayStatus): string {
  if (status === "connected" || status === "synced") return "bg-emerald-100 text-emerald-800";
  if (status === "error" || status === "expired") return "bg-red-100 text-red-800";
  if (status === "syncing") return "bg-blue-100 text-blue-800";
  if (status === "demo") return "bg-violet-100 text-violet-800";
  if (status === "manual_required") return "bg-amber-100 text-amber-900";
  if (status === "disabled") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

export function getProviderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Verfügbar",
    prepared: "Vorbereitet",
    disabled: "Deaktiviert",
    error: "Fehler",
    coming_soon: "Demnächst",
  };
  return map[status] ?? CONNECTION_STATUS_LABELS[status as ConnectionDisplayStatus] ?? status;
}

export function buildConnectionCardViewModel(
  connection: Record<string, unknown>,
  syncRuns: Record<string, unknown>[]
): ConnectionCardViewModel {
  const provider = providerFromConnection(connection);
  const status = resolveConnectionDisplayStatus(connection, syncRuns);
  const hasSynced =
    Boolean(connection.last_sync_at) || hasSyncForConnection(String(connection.id), syncRuns);
  const next = getNextAction(provider.key, status, hasSynced);
  const buttons = providerButtons(provider.key, status, next.action);

  const m365Hint =
    provider.key === "microsoft365" && status === "prepared"
      ? "Die Verbindung wurde angelegt. Als nächstes kann die Verbindung geprüft oder die Microsoft-Anmeldung gestartet werden."
      : CONNECTION_STATUS_HINTS[status];

  return {
    id: String(connection.id),
    name: String(connection.name),
    providerKey: provider.key,
    providerName: provider.name,
    typeLabel: PROVIDER_TYPE_LABELS[provider.key] ?? `${provider.name} · Integration`,
    description: PROVIDER_DESCRIPTIONS[provider.key] ?? String(connection.base_url ?? ""),
    status,
    statusLabel: CONNECTION_STATUS_LABELS[status],
    statusHint: m365Hint,
    statusBadgeClass: statusBadgeClass(status),
    systemAddress: connection.base_url ? String(connection.base_url) : null,
    lastSyncLabel: formatLastSync(connection, syncRuns),
    discoveredData: discoveredDataFromConnection(connection),
    nextActionLabel: next.label,
    nextAction: next.action,
    primaryAction: buttons.primary,
    secondaryActions: buttons.secondary,
    settingsAction: buttons.settings,
  };
}
