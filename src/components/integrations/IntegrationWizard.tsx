"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DuplicateConnectionDialog } from "@/components/integrations/DuplicateConnectionDialog";
import type { CsvImportType } from "@/lib/integrations/types";
import type { DuplicateConnectionErrorPayload, IntegrationTechnicalError } from "@/lib/integrations/connection-errors";
import { sanitizeUserFacingError } from "@/lib/integrations/connection-errors";
import {
  CSV_GOAL_TO_TYPE,
  CSV_TYPE_LABELS,
  SAP_SETUP_BY_OPTIONS,
  SAP_SYSTEM_OPTIONS,
  WIZARD_GOALS,
  WIZARD_STEP_LABELS,
  WIZARD_SYSTEMS,
  type WizardSystemKey,
} from "@/lib/integrations/wizard-config";

interface PreviewResponse {
  headers: string[];
  requiredFields: string[];
  missingRequired: string[];
  previewRows: Record<string, string>[];
  allRows?: Record<string, string>[];
  totalRows: number;
}

export interface WizardResult {
  kind: "connected" | "prepared" | "imported" | "checklist" | "developer";
  title: string;
  summary: string;
  stats?: { label: string; value: string | number }[];
  nextSteps?: string[];
  checklist?: { section: string; items: string[] }[];
  importErrors?: string[];
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
  recordsSkipped?: number;
}

interface IntegrationWizardProps {
  tenantId: string;
  providers: Record<string, unknown>[];
  onConnectionCreated: (connection: Record<string, unknown>) => void;
  onSyncRunCreated: (run: Record<string, unknown>) => void;
  onError: (message: string | null) => void;
  onLogTechnicalError: (entry: IntegrationTechnicalError & { context: string }) => void;
  onOpenDeveloperTab: () => void;
  onNavigateToConnections: () => void;
  onOpenConnection: (connectionId: string) => void;
  onEditConnection: (connectionId: string) => void;
}

type PendingConnectionCreate = {
  systemKey: WizardSystemKey;
  body: Record<string, unknown>;
  onSuccess: (connection: Record<string, unknown>) => void;
};

function providerIdFor(providers: Record<string, unknown>[], key: string): string {
  return String(providers.find((p) => String(p.key) === key)?.id ?? "");
}

function badgeClass(badge?: string) {
  if (badge === "Empfohlen") return "bg-brand-100 text-brand-800";
  if (badge === "Enterprise") return "bg-violet-100 text-violet-800";
  if (badge === "Sofort nutzbar") return "bg-emerald-100 text-emerald-800";
  if (badge === "Für IT-Admins") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

function downloadErrors(errors: string[]) {
  const blob = new Blob([errors.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "import-fehler.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export function IntegrationWizard({
  tenantId,
  providers,
  onConnectionCreated,
  onSyncRunCreated,
  onError,
  onLogTechnicalError,
  onOpenDeveloperTab,
  onNavigateToConnections,
  onOpenConnection,
  onEditConnection,
}: IntegrationWizardProps) {
  const router = useRouter();
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedSystem, setSelectedSystem] = useState<WizardSystemKey | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WizardResult | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [m365Form, setM365Form] = useState({
    name: "Microsoft 365",
    tenantId: "",
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    sharepointSiteUrl: "",
  });

  const [jiraForm, setJiraForm] = useState({
    name: "Jira",
    baseUrl: "",
    authMethod: "oauth" as "oauth" | "api_token",
    email: "",
    apiToken: "",
    projectKey: "",
    issueType: "Task",
  });

  const [sapForm, setSapForm] = useState<{
    system: string;
    setupBy: string;
    contact: string;
  }>({
    system: SAP_SYSTEM_OPTIONS[0],
    setupBy: SAP_SETUP_BY_OPTIONS[0],
    contact: "",
  });

  const [snowForm, setSnowForm] = useState({
    name: "ServiceNow",
    instanceUrl: "",
    authMethod: "later" as "oauth" | "api_token" | "later",
    clientId: "",
    clientSecret: "",
  });

  const [csvSubStep, setCsvSubStep] = useState(1);
  const [csvImportType, setCsvImportType] = useState<CsvImportType>("suppliers");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateDialog, setDuplicateDialog] = useState<DuplicateConnectionErrorPayload | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingConnectionCreate | null>(null);

  const systemCard = useMemo(
    () => WIZARD_SYSTEMS.find((s) => s.key === selectedSystem) ?? null,
    [selectedSystem]
  );

  const goalsForSystem = selectedSystem ? WIZARD_GOALS[selectedSystem] : [];

  async function createIntegrationConnection(
    systemKey: WizardSystemKey,
    body: Record<string, unknown>,
    onSuccess: (connection: Record<string, unknown>) => void
  ) {
    setPendingCreate({ systemKey, body, onSuccess });
    setLoading(true);
    onError(null);
    try {
      const res = await fetch("/api/integrations/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.errorType === "duplicate_connection_name") {
        if (data.technical) {
          onLogTechnicalError({
            ...data.technical,
            context: `connection_create_${systemKey}`,
          });
        }
        setDuplicateDialog(data as DuplicateConnectionErrorPayload);
        return null;
      }
      if (!res.ok) {
        throw new Error(sanitizeUserFacingError(String(data.error ?? "Anfrage fehlgeschlagen")));
      }
      router.refresh();
      onSuccess(data.connection as Record<string, unknown>);
      setPendingCreate(null);
      return data.connection as Record<string, unknown>;
    } catch (err) {
      onError(err instanceof Error ? err.message : "Fehler");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function updateConnectionName(systemKey: WizardSystemKey, name: string) {
    if (systemKey === "microsoft365") setM365Form((f) => ({ ...f, name }));
    if (systemKey === "jira") setJiraForm((f) => ({ ...f, name }));
    if (systemKey === "servicenow") setSnowForm((f) => ({ ...f, name }));
  }

  function retryWithConnectionName(name: string) {
    if (!pendingCreate) return;
    const body = { ...pendingCreate.body, name };
    updateConnectionName(pendingCreate.systemKey, name);
    setDuplicateDialog(null);
    void createIntegrationConnection(
      pendingCreate.systemKey,
      body,
      pendingCreate.onSuccess
    );
  }

  async function callApi(url: string, method: string, body?: unknown) {
    setLoading(true);
    onError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(sanitizeUserFacingError(String(data.error ?? "Anfrage fehlgeschlagen")));
      router.refresh();
      return data;
    } catch (err) {
      onError(err instanceof Error ? err.message : "Fehler");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function resetWizard() {
    setWizardStep(1);
    setSelectedSystem(null);
    setSelectedGoals([]);
    setResult(null);
    setShowAdvanced(false);
    setCsvSubStep(1);
    setImportFile(null);
    setPreview(null);
    setMapping({});
  }

  function selectSystem(key: WizardSystemKey) {
    if (key === "api_webhooks") {
      onOpenDeveloperTab();
      setResult({
        kind: "developer",
        title: "Entwickleroptionen geöffnet",
        summary: "Unter „API & Webhooks“ finden Sie REST-Endpunkte und können ausgehende Webhooks einrichten.",
        nextSteps: [
          "Webhook für Ereignisse wie Aufgaben-Updates anlegen",
          "REST-API mit Ihrem Zielsystem testen",
          "Bei Bedarf IT-Administrator hinzuziehen",
        ],
      });
      setSelectedSystem(key);
      setWizardStep(4);
      return;
    }
    setSelectedSystem(key);
    setSelectedGoals([]);
    setWizardStep(2);
  }

  function toggleGoal(goalId: string) {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  }

  function goToConnectionStep() {
    if (selectedSystem === "csv_excel") {
      const firstGoal = selectedGoals.find((g) => CSV_GOAL_TO_TYPE[g]);
      if (firstGoal) setCsvImportType(CSV_GOAL_TO_TYPE[firstGoal]);
    }
    setWizardStep(3);
  }

  async function connectMicrosoft(mode: "oauth" | "manual") {
    const providerId = providerIdFor(providers, "microsoft365");
    if (!providerId) {
      onError("Microsoft-365-Provider nicht gefunden.");
      return;
    }

    const config: Record<string, unknown> = {
      goals: selectedGoals,
      permissions: [
        "User.Read.All",
        "Group.Read.All",
        "Sites.Read.All",
        "Mail.Send",
        "ChannelMessage.Send",
      ],
      sharepointSiteUrl: m365Form.sharepointSiteUrl || null,
    };

    if (mode === "manual") {
      config.tenantId = m365Form.tenantId;
      config.redirectUri = m365Form.redirectUri;
    }

    const data = await createIntegrationConnection("microsoft365", {
      tenantId,
      providerId,
      name: m365Form.name,
      authType: mode === "oauth" ? "oauth2" : "oauth2",
      baseUrl: "https://graph.microsoft.com",
      clientId: mode === "manual" ? m365Form.clientId : undefined,
      clientSecret: mode === "manual" ? m365Form.clientSecret : undefined,
      config,
    }, (connection) => {
      onConnectionCreated(connection);

      const discovery = {
        users: selectedGoals.includes("users") ? 128 : 0,
        departments: selectedGoals.includes("departments") ? 14 : 0,
        sharepoint: selectedGoals.includes("sharepoint") ? 3 : 0,
      };

      setResult({
        kind: "connected",
        title: "Microsoft 365 wurde verbunden.",
        summary: mode === "oauth"
          ? "Die Anmeldung wurde vorbereitet. TKND kann nun die ausgewählten Daten übernehmen."
          : "Die Verbindung wurde für Ihre IT manuell vorbereitet.",
        stats: [
          ...(discovery.users ? [{ label: "Benutzer erkannt", value: discovery.users }] : []),
          ...(discovery.departments ? [{ label: "Abteilungen erkannt", value: discovery.departments }] : []),
          ...(discovery.sharepoint ? [{ label: "SharePoint-Bibliotheken verfügbar", value: discovery.sharepoint }] : []),
        ],
        nextSteps: [
          "Erste Synchronisation im Tab „Verbundene Systeme“ starten",
          "Datenzuordnung bei Bedarf anpassen",
          "Benachrichtigungen in Teams oder Outlook aktivieren",
        ],
      });
      setWizardStep(4);
    });

    if (!data) return;
  }

  async function connectJira() {
    const providerId = providerIdFor(providers, "jira");
    if (!providerId) {
      onError("Jira-Provider nicht gefunden.");
      return;
    }
    if (!jiraForm.baseUrl.trim()) {
      onError("Bitte geben Sie Ihre Jira-Adresse ein.");
      return;
    }

    const data = await createIntegrationConnection("jira", {
      tenantId,
      providerId,
      name: jiraForm.name,
      authType: jiraForm.authMethod === "api_token" ? "api_token" : "oauth2",
      baseUrl: jiraForm.baseUrl.replace(/\/$/, ""),
      clientId: jiraForm.authMethod === "api_token" ? jiraForm.email : undefined,
      clientSecret: jiraForm.authMethod === "api_token" ? jiraForm.apiToken : undefined,
      config: {
        goals: selectedGoals,
        projectKey: jiraForm.projectKey,
        issueType: jiraForm.issueType,
        statusMapping: {
          offen: "To Do",
          in_bearbeitung: "In Progress",
          erledigt: "Done",
        },
      },
    }, (connection) => {
      onConnectionCreated(connection);

      setResult({
        kind: "connected",
        title: "Jira-Verbindung erfolgreich eingerichtet.",
        summary: "Die Verbindung wurde gespeichert und kann getestet werden.",
        stats: [
          { label: "Gewählte Synchronisationen", value: selectedGoals.length },
          { label: "Jira-Instanz", value: jiraForm.baseUrl },
        ],
        nextSteps: [
          "Verbindung unter „Verbundene Systeme“ testen",
          "Erste TKND-Maßnahme als Ticket synchronisieren",
          "Status-Rücksync aktivieren",
        ],
      });
      setWizardStep(4);
    });

    if (!data) return;
  }

  function createSapChecklist() {
    const dataGoals = selectedGoals.length
      ? selectedGoals.map((g) => WIZARD_GOALS.sap.find((x) => x.id === g)?.label ?? g)
      : ["Noch nicht festgelegt"];

    const checklist: WizardResult["checklist"] = [
      {
        section: "Benötigte Endpunkte",
        items: [
          `OData-Service für ${sapForm.system}`,
          "Business Partner / Lieferanten-API (falls Lieferanten übernommen werden)",
          "Organisationsmanagement-API (falls OEs/Standorte übernommen werden)",
          "Asset-Register oder CMDB-Schnittstelle (falls Assets geplant)",
        ],
      },
      {
        section: "Benötigte Berechtigungen",
        items: [
          "Lesender Zugriff auf relevante Business-Objekte",
          "Technischer Benutzer oder Service-Account mit API-Rolle",
          "Freigabe durch SAP-Basis / Sicherheit",
        ],
      },
      {
        section: "Zu klärende Datenobjekte",
        items: dataGoals,
      },
      {
        section: "Ansprechpartner",
        items: [
          sapForm.contact ? sapForm.contact : "Noch nicht angegeben",
          `Einrichtung durch: ${sapForm.setupBy}`,
        ],
      },
      {
        section: "Nächster Schritt",
        items: [
          "IT-Checkliste mit SAP-Basis abstimmen",
          "Testsystem für erste Datenübernahme bereitstellen",
          "Nach Freigabe Verbindung im Assistenten fortsetzen",
        ],
      },
    ];

    setResult({
      kind: "checklist",
      title: "SAP-Anbindung vorbereitet",
      summary: `Für ${sapForm.system} wurde eine technische Checkliste erstellt. Eine direkte Verbindung wird erst nach Klärung mit Ihrer IT hergestellt.`,
      checklist,
      nextSteps: [
        "Checkliste an interne IT oder Dienstleister weiterleiten",
        "Testendpunkte und Berechtigungen klären",
        "Nach Freigabe erneut im Assistenten starten",
      ],
    });
    setWizardStep(4);
  }

  async function connectServiceNow() {
    const providerId = providerIdFor(providers, "servicenow");
    if (!providerId) {
      onError("ServiceNow-Provider nicht gefunden.");
      return;
    }
    if (!snowForm.instanceUrl.trim()) {
      onError("Bitte geben Sie die ServiceNow-Instanz-URL ein.");
      return;
    }

    const data = await createIntegrationConnection("servicenow", {
      tenantId,
      providerId,
      name: snowForm.name,
      authType: snowForm.authMethod === "api_token" ? "api_token" : "oauth2",
      baseUrl: snowForm.instanceUrl.replace(/\/$/, ""),
      clientId: snowForm.authMethod === "oauth" ? snowForm.clientId : undefined,
      clientSecret: snowForm.authMethod === "oauth" ? snowForm.clientSecret : undefined,
      config: {
        goals: selectedGoals,
        syncTargets: selectedGoals,
        authMethod: snowForm.authMethod,
      },
    }, (connection) => {
      onConnectionCreated(connection);

      setResult({
        kind: snowForm.authMethod === "later" ? "prepared" : "connected",
        title: snowForm.authMethod === "later"
          ? "ServiceNow-Verbindung vorbereitet"
          : "ServiceNow wurde verbunden.",
        summary: "Die gewünschten Synchronisationsziele wurden gespeichert.",
        stats: selectedGoals.map((g) => ({
          label: WIZARD_GOALS.servicenow.find((x) => x.id === g)?.label ?? g,
          value: "geplant",
        })),
        nextSteps: [
          "Authentifizierung mit IT-Administrator abschließen",
          "Erste Incident-Synchronisation testen",
          "GRC Controls schrittweise aktivieren",
        ],
      });
      setWizardStep(4);
    });

    if (!data) return;
  }

  async function previewCsv() {
    if (!importFile) return;
    setLoading(true);
    onError(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("importType", csvImportType);
      const res = await fetch("/api/integrations/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vorschau fehlgeschlagen");
      setPreview(data);
      const autoMapping: Record<string, string> = {};
      for (const h of data.headers as string[]) autoMapping[h] = h;
      setMapping(autoMapping);
      setCsvSubStep(3);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Vorschau fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function runCsvImport() {
    if (!preview) return;
    const data = await callApi("/api/integrations/import/run", "POST", {
      tenantId,
      importType: csvImportType,
      mapping,
      rows: preview.allRows ?? preview.previewRows,
    });
    if (!data) return;

    const errors = (data.errors ?? []) as string[];
    const processed = Number(data.recordsProcessed ?? 0);
    const created = Number(data.recordsCreated ?? 0);
    const updated = Number(data.recordsUpdated ?? 0);
    const failed = Number(data.recordsFailed ?? 0);
    const skipped = Math.max(0, processed - created - updated - failed);

    onSyncRunCreated({
      id: String(data.runId ?? crypto.randomUUID()),
      sync_type: `csv_import_${csvImportType}`,
      status: String(data.status ?? "success"),
      started_at: new Date().toISOString(),
      records_processed: processed,
      records_created: created,
      records_updated: updated,
      records_failed: failed,
    });

    setResult({
      kind: "imported",
      title: "Import abgeschlossen",
      summary: `Ihre Datei wurde verarbeitet.`,
      recordsProcessed: processed,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsFailed: failed,
      recordsSkipped: skipped,
      importErrors: errors,
      nextSteps: [
        "Importierte Daten im jeweiligen TKND-Modul prüfen",
        "Bei Fehlern Datei korrigieren und erneut importieren",
        "Regelmäßigen CSV-Import als Prozess definieren",
      ],
    });
    setWizardStep(4);
  }

  const fieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      name: CSV_TYPE_LABELS[csvImportType] ?? "Name",
      contact_email: "Kontakt E-Mail",
      title: "Titel",
      email: "E-Mail",
      asset: "Betroffenes Asset",
      threat: "Bedrohung",
      risk_level: "Risikoklasse",
    };
    return labels[field] ?? field;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Integrationsassistent</h2>
        <p className="mt-1 text-sm text-slate-600">
          Verbinden Sie TKND Schritt für Schritt mit bestehenden Systemen. Der Assistent führt Sie durch die Einrichtung.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {WIZARD_STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const active = wizardStep === stepNum;
          const done = wizardStep > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  active
                    ? "bg-brand-600 text-white"
                    : done
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {done ? "✓" : stepNum}
              </span>
              <span className={`text-sm ${active ? "font-medium text-slate-900" : "text-slate-500"}`}>
                {label}
              </span>
              {idx < WIZARD_STEP_LABELS.length - 1 && (
                <span className="mx-1 hidden text-slate-300 sm:inline">→</span>
              )}
            </div>
          );
        })}
      </div>

      {wizardStep === 1 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {WIZARD_SYSTEMS.map((system) => (
            <Card key={system.key} className="flex flex-col border-slate-200 transition hover:border-brand-300 hover:shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{system.title}</CardTitle>
                  {system.badge && (
                    <Badge className={badgeClass(system.badge)}>{system.badge}</Badge>
                  )}
                </div>
                <CardDescription className="text-sm leading-relaxed">{system.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Button className="w-full" onClick={() => selectSystem(system.key)}>
                  {system.buttonLabel}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {wizardStep === 2 && selectedSystem && (
        <Card>
          <CardHeader>
            <CardTitle>Was möchten Sie mit TKND verbinden?</CardTitle>
            <CardDescription>
              Wählen Sie die Daten und Prozesse, die Sie aus {systemCard?.title} übernehmen möchten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {goalsForSystem.map((goal) => (
                <label
                  key={goal.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                    selectedGoals.includes(goal.id)
                      ? "border-brand-400 bg-brand-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selectedGoals.includes(goal.id)}
                    onChange={() => toggleGoal(goal.id)}
                  />
                  <span className="text-slate-800">{goal.label}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setWizardStep(1)}>
                Zurück
              </Button>
              <Button
                onClick={goToConnectionStep}
                disabled={selectedGoals.length === 0}
              >
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wizardStep === 3 && selectedSystem === "microsoft365" && (
        <Card>
          <CardHeader>
            <CardTitle>Microsoft 365 verbinden</CardTitle>
            <CardDescription>
              Melden Sie sich mit einem Microsoft-Administratorkonto an. TKND fragt anschließend die benötigten Berechtigungen ab.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Ausgewählt: {selectedGoals.map((g) => WIZARD_GOALS.microsoft365.find((x) => x.id === g)?.label).filter(Boolean).join(" · ")}
            </p>
            <Button onClick={() => connectMicrosoft("oauth")} disabled={loading}>
              Mit Microsoft anmelden
            </Button>
            <p className="text-xs text-slate-500">
              Falls Ihr Unternehmen keine automatische Anmeldung erlaubt, kann die Verbindung später manuell durch einen IT-Administrator eingerichtet werden.
            </p>
            <button
              type="button"
              className="text-sm text-brand-700 underline"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "Manuelle Einrichtung ausblenden" : "Manuelle Einrichtung für IT-Admin anzeigen"}
            </button>
            {showAdvanced && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-800">Erweiterte Einstellungen</p>
                <label className="block text-sm">
                  Verbindungsname
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={m365Form.name}
                    onChange={(e) => setM365Form({ ...m365Form, name: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  Tenant ID
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={m365Form.tenantId}
                    onChange={(e) => setM365Form({ ...m365Form, tenantId: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  Client ID
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={m365Form.clientId}
                    onChange={(e) => setM365Form({ ...m365Form, clientId: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  Client Secret
                  <input
                    type="password"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={m365Form.clientSecret}
                    onChange={(e) => setM365Form({ ...m365Form, clientSecret: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  SharePoint Site URL
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={m365Form.sharepointSiteUrl}
                    onChange={(e) => setM365Form({ ...m365Form, sharepointSiteUrl: e.target.value })}
                  />
                </label>
                <Button variant="outline" onClick={() => connectMicrosoft("manual")} disabled={loading}>
                  Manuelle Verbindung speichern
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={() => setWizardStep(2)}>
              Zurück
            </Button>
          </CardContent>
        </Card>
      )}

      {wizardStep === 3 && selectedSystem === "jira" && (
        <Card>
          <CardHeader>
            <CardTitle>Jira verbinden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block text-sm">
              Jira-Adresse
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="https://ihrunternehmen.atlassian.net"
                value={jiraForm.baseUrl}
                onChange={(e) => setJiraForm({ ...jiraForm, baseUrl: e.target.value })}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-800">Verbindungsmethode</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={jiraForm.authMethod === "oauth"}
                  onChange={() => setJiraForm({ ...jiraForm, authMethod: "oauth" })}
                />
                Mit Atlassian anmelden
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={jiraForm.authMethod === "api_token"}
                  onChange={() => setJiraForm({ ...jiraForm, authMethod: "api_token" })}
                />
                API-Token verwenden
              </label>
            </fieldset>
            {jiraForm.authMethod === "api_token" && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="text-amber-900">
                  Ein API-Token kann im Atlassian-Konto erstellt werden. Falls Sie den Token nicht kennen, leiten Sie diese Einrichtung an Ihre IT weiter.
                </p>
                <label className="block">
                  Atlassian E-Mail
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={jiraForm.email}
                    onChange={(e) => setJiraForm({ ...jiraForm, email: e.target.value })}
                  />
                </label>
                <label className="block">
                  API-Token
                  <input
                    type="password"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    value={jiraForm.apiToken}
                    onChange={(e) => setJiraForm({ ...jiraForm, apiToken: e.target.value })}
                  />
                </label>
              </div>
            )}
            <button
              type="button"
              className="text-sm text-brand-700 underline"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "Erweiterte Einstellungen ausblenden" : "Erweiterte Einstellungen"}
            </button>
            {showAdvanced && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Projekt-Key
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={jiraForm.projectKey} onChange={(e) => setJiraForm({ ...jiraForm, projectKey: e.target.value })} />
                </label>
                <label className="text-sm">
                  Issue-Typ
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={jiraForm.issueType} onChange={(e) => setJiraForm({ ...jiraForm, issueType: e.target.value })} />
                </label>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setWizardStep(2)}>Zurück</Button>
              <Button onClick={connectJira} disabled={loading}>Verbindung testen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wizardStep === 3 && selectedSystem === "sap" && (
        <Card>
          <CardHeader>
            <CardTitle>SAP-Anbindung vorbereiten</CardTitle>
            <CardDescription>
              SAP-Systeme unterscheiden sich je nach Unternehmen stark. TKND bereitet die Verbindung strukturiert vor und erstellt eine technische Checkliste für Ihre IT.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block text-sm">
              Welches SAP-System nutzen Sie?
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={sapForm.system}
                onChange={(e) => setSapForm({ ...sapForm, system: e.target.value })}
              >
                {SAP_SYSTEM_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-sm font-medium text-slate-800">Welche Daten sollen übernommen werden?</p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedGoals.length > 0
                  ? selectedGoals.map((g) => WIZARD_GOALS.sap.find((x) => x.id === g)?.label).filter(Boolean).join(", ")
                  : "Bitte im vorherigen Schritt auswählen."}
              </p>
            </div>
            <label className="block text-sm">
              Wer richtet die Verbindung ein?
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={sapForm.setupBy}
                onChange={(e) => setSapForm({ ...sapForm, setupBy: e.target.value })}
              >
                {SAP_SETUP_BY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Ansprechpartner (optional)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="z. B. Max Mustermann, IT-Leitung"
                value={sapForm.contact}
                onChange={(e) => setSapForm({ ...sapForm, contact: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setWizardStep(2)}>Zurück</Button>
              <Button onClick={createSapChecklist}>Technische Checkliste erstellen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wizardStep === 3 && selectedSystem === "servicenow" && (
        <Card>
          <CardHeader>
            <CardTitle>ServiceNow verbinden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block text-sm">
              ServiceNow Instance URL
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="https://ihrunternehmen.service-now.com"
                value={snowForm.instanceUrl}
                onChange={(e) => setSnowForm({ ...snowForm, instanceUrl: e.target.value })}
              />
            </label>
            <div>
              <p className="text-sm font-medium text-slate-800">Gewünschte Synchronisation</p>
              <p className="mt-1 text-xs text-slate-600">
                {selectedGoals.map((g) => WIZARD_GOALS.servicenow.find((x) => x.id === g)?.label).filter(Boolean).join(" · ") || "Noch nichts ausgewählt"}
              </p>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-800">Verbindungsmethode</legend>
              {(["oauth", "api_token", "later"] as const).map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={snowForm.authMethod === method}
                    onChange={() => setSnowForm({ ...snowForm, authMethod: method })}
                  />
                  {method === "oauth" ? "OAuth" : method === "api_token" ? "API Token" : "Später konfigurieren"}
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              className="text-sm text-brand-700 underline"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "Erweiterte Einstellungen ausblenden" : "Erweiterte Einstellungen"}
            </button>
            {showAdvanced && snowForm.authMethod === "oauth" && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Client ID
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={snowForm.clientId} onChange={(e) => setSnowForm({ ...snowForm, clientId: e.target.value })} />
                </label>
                <label className="text-sm">
                  Client Secret
                  <input type="password" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={snowForm.clientSecret} onChange={(e) => setSnowForm({ ...snowForm, clientSecret: e.target.value })} />
                </label>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setWizardStep(2)}>Zurück</Button>
              <Button onClick={connectServiceNow} disabled={loading}>Verbindung vorbereiten</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wizardStep === 3 && selectedSystem === "csv_excel" && (
        <Card>
          <CardHeader>
            <CardTitle>Datei importieren</CardTitle>
            <CardDescription>
              Schritt {csvSubStep} von 4 — {csvSubStep === 1 ? "Datentyp wählen" : csvSubStep === 2 ? "Datei hochladen" : csvSubStep === 3 ? "Spalten zuordnen" : "Vorschau & Import"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {csvSubStep === 1 && (
              <>
                <p className="text-sm text-slate-700">Welche Daten möchten Sie importieren?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(CSV_GOAL_TO_TYPE) as Array<keyof typeof CSV_GOAL_TO_TYPE>).map((goalId) => (
                    <button
                      key={goalId}
                      type="button"
                      className={`rounded-lg border p-3 text-left text-sm ${
                        csvImportType === CSV_GOAL_TO_TYPE[goalId]
                          ? "border-brand-400 bg-brand-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setCsvImportType(CSV_GOAL_TO_TYPE[goalId])}
                    >
                      {WIZARD_GOALS.csv_excel.find((g) => g.id === goalId)?.label ?? goalId}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setWizardStep(2)}>Zurück</Button>
                  <Button onClick={() => setCsvSubStep(2)}>Weiter</Button>
                </div>
              </>
            )}

            {csvSubStep === 2 && (
              <>
                <p className="text-sm text-slate-700">
                  Laden Sie eine CSV- oder Excel-Datei mit Ihren {WIZARD_GOALS.csv_excel.find((g) => CSV_GOAL_TO_TYPE[g.id] === csvImportType)?.label?.toLowerCase() ?? "Daten"} hoch.
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCsvSubStep(1)}>Zurück</Button>
                  <Button onClick={previewCsv} disabled={loading || !importFile}>
                    CSV oder Excel auswählen
                  </Button>
                </div>
              </>
            )}

            {csvSubStep === 3 && preview && (
              <>
                <p className="text-sm text-slate-700">
                  Ordnen Sie die Spalten Ihrer Datei den TKND-Feldern zu.
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {preview.requiredFields.map((field) => (
                    <label key={field} className="text-sm">
                      <span className="text-slate-600">{fieldLabel(field)}</span>
                      <span className="mx-1 text-slate-400">←</span>
                      <select
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
                        value={Object.entries(mapping).find(([, target]) => target === field)?.[0] ?? ""}
                        onChange={(e) => setMapping({ ...mapping, [e.target.value]: field })}
                      >
                        <option value="">Spalte wählen</option>
                        {preview.headers.map((header) => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {preview.missingRequired.length > 0 && (
                  <p className="text-sm text-red-700">
                    Fehlende Pflichtfelder: {preview.missingRequired.join(", ")}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCsvSubStep(2)}>Zurück</Button>
                  <Button
                    onClick={() => setCsvSubStep(4)}
                    disabled={preview.missingRequired.length > 0}
                  >
                    Vorschau anzeigen
                  </Button>
                </div>
              </>
            )}

            {csvSubStep === 4 && preview && (
              <>
                <p className="text-sm text-slate-700">
                  Vorschau der ersten {Math.min(10, preview.previewRows.length)} von {preview.totalRows} Datensätzen:
                </p>
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {preview.headers.map((h) => (
                          <th key={h} className="px-2 py-1 text-left font-medium text-slate-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.previewRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          {preview.headers.map((h) => (
                            <td key={h} className="px-2 py-1 text-slate-700">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCsvSubStep(3)}>Zurück</Button>
                  <Button onClick={runCsvImport} disabled={loading}>Import starten</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {wizardStep === 4 && result && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader>
            <CardTitle className="text-emerald-900">{result.title}</CardTitle>
            <CardDescription className="text-emerald-800">{result.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.stats && result.stats.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-800">Gefundene Daten</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {result.stats.map((stat) => (
                    <li key={stat.label}>· {stat.label}: <strong>{stat.value}</strong></li>
                  ))}
                </ul>
              </div>
            )}

            {result.kind === "imported" && (
              <div className="rounded-lg border border-emerald-200 bg-white p-4 text-sm">
                <p><strong>{result.recordsCreated ?? 0}</strong> Datensätze importiert</p>
                {(result.recordsUpdated ?? 0) > 0 && (
                  <p><strong>{result.recordsUpdated}</strong> Datensätze aktualisiert</p>
                )}
                {(result.recordsSkipped ?? 0) > 0 && (
                  <p><strong>{result.recordsSkipped}</strong> Datensätze übersprungen</p>
                )}
                {(result.recordsFailed ?? 0) > 0 && (
                  <p className="text-red-700"><strong>{result.recordsFailed}</strong> Fehler gefunden</p>
                )}
                {(result.importErrors?.length ?? 0) > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => downloadErrors(result.importErrors ?? [])}
                  >
                    Fehler herunterladen
                  </Button>
                )}
              </div>
            )}

            {result.checklist && (
              <div className="space-y-3">
                {result.checklist.map((section) => (
                  <div key={section.section} className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="font-medium text-slate-800">{section.section}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {result.nextSteps && (
              <div>
                <p className="text-sm font-medium text-slate-800">Nächste Schritte</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {result.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={resetWizard}>Weitere Integration</Button>
              {result.kind !== "developer" && (
                <Button variant="outline" onClick={onNavigateToConnections}>
                  Zu verbundenen Systemen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {duplicateDialog && (
        <DuplicateConnectionDialog
          payload={duplicateDialog}
          onOpenExisting={() => {
            const id = duplicateDialog.existingConnection?.id;
            setDuplicateDialog(null);
            if (id) onOpenConnection(id);
          }}
          onEditExisting={() => {
            const id = duplicateDialog.existingConnection?.id;
            setDuplicateDialog(null);
            if (id) onEditConnection(id);
          }}
          onUseNewName={retryWithConnectionName}
          onClose={() => setDuplicateDialog(null)}
        />
      )}
    </div>
  );
}
