"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { IntegrationWizard } from "@/components/integrations/IntegrationWizard";
import { DuplicateConnectionDialog } from "@/components/integrations/DuplicateConnectionDialog";
import type { CsvImportType } from "@/lib/integrations/types";
import type { DuplicateConnectionErrorPayload, IntegrationTechnicalError } from "@/lib/integrations/connection-errors";
import { sanitizeUserFacingError } from "@/lib/integrations/connection-errors";

const TABS = [
  "Übersicht",
  "Verbundene Systeme",
  "Integrationsassistent",
  "Datenzuordnung / Mapping",
  "Synchronisationsläufe",
  "API & Webhooks",
  "Import / Export",
  "Fehlerprotokoll",
  "Sicherheit & Berechtigungen",
] as const;

const IMPORT_TYPES: CsvImportType[] = [
  "suppliers",
  "users",
  "departments",
  "assets",
  "risks",
  "measures",
  "evidence",
];

const IMPORT_TYPE_LABELS: Record<CsvImportType, string> = {
  suppliers: "Lieferanten",
  users: "Benutzer",
  departments: "Abteilungen",
  assets: "Assets",
  risks: "Risiken",
  measures: "Maßnahmen",
  evidence: "Nachweise",
};

function statusBadge(status: string) {
  if (status === "active" || status === "success") return "bg-emerald-100 text-emerald-800";
  if (status === "error" || status === "failed") return "bg-red-100 text-red-800";
  if (status === "partial") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

interface PreviewResponse {
  headers: string[];
  requiredFields: string[];
  missingRequired: string[];
  previewRows: Record<string, string>[];
  allRows?: Record<string, string>[];
  totalRows: number;
}

interface TechnicalErrorLogEntry extends IntegrationTechnicalError {
  context: string;
  at: string;
}

export function IntegrationsPageClient({
  tenantId,
  companyName,
  initialProviders,
  initialConnections,
  initialSyncRuns,
  initialWebhooks,
  initialError,
}: {
  tenantId: string;
  companyName: string;
  initialProviders: Record<string, unknown>[];
  initialConnections: Record<string, unknown>[];
  initialSyncRuns: Record<string, unknown>[];
  initialWebhooks: Record<string, unknown>[];
  initialError: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Übersicht");
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState(initialProviders);
  const [connections, setConnections] = useState(initialConnections);
  const [syncRuns, setSyncRuns] = useState(initialSyncRuns);
  const [webhooks, setWebhooks] = useState(initialWebhooks);

  const [mappingForm, setMappingForm] = useState({
    connectionId: "",
    sourceObject: "",
    targetObject: "",
    sourceField: "",
    targetField: "",
    transformationRule: "",
  });

  const [webhookForm, setWebhookForm] = useState({
    name: "",
    eventType: "task.updated",
    targetUrl: "",
  });

  const [importType, setImportType] = useState<CsvImportType>("suppliers");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const [highlightedConnectionId, setHighlightedConnectionId] = useState<string | null>(null);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [editingConnectionName, setEditingConnectionName] = useState("");
  const [technicalErrorLogs, setTechnicalErrorLogs] = useState<TechnicalErrorLogEntry[]>([]);
  const [duplicateDialog, setDuplicateDialog] = useState<DuplicateConnectionErrorPayload | null>(null);
  const [pendingRenameConnectionId, setPendingRenameConnectionId] = useState<string | null>(null);

  function logTechnicalError(entry: IntegrationTechnicalError & { context: string }) {
    setTechnicalErrorLogs((prev) => [
      {
        ...entry,
        at: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 50));
  }

  function openConnection(connectionId: string) {
    setHighlightedConnectionId(connectionId);
    setEditingConnectionId(null);
    setActiveTab("Verbundene Systeme");
  }

  function editConnection(connectionId: string) {
    const connection = connections.find((c) => String(c.id) === connectionId);
    setHighlightedConnectionId(connectionId);
    setEditingConnectionId(connectionId);
    setEditingConnectionName(String(connection?.name ?? ""));
    setActiveTab("Verbundene Systeme");
  }

  async function saveConnectionName(connectionId: string, name: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: connectionId, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.errorType === "duplicate_connection_name") {
        if (data.technical) {
          logTechnicalError({ ...data.technical, context: "connection_rename" });
        }
        setPendingRenameConnectionId(connectionId);
        setDuplicateDialog(data as DuplicateConnectionErrorPayload);
        return;
      }
      if (!res.ok) {
        throw new Error(sanitizeUserFacingError(String(data.error ?? "Speichern fehlgeschlagen")));
      }
      setConnections(connections.map((c) => (String(c.id) === connectionId ? data.connection : c)));
      setEditingConnectionId(null);
      setPendingRenameConnectionId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function callApi(url: string, method: string, body?: unknown) {
    setLoading(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : "Fehler");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function createWebhook() {
    const data = await callApi("/api/integrations/webhooks", "POST", {
      tenantId,
      name: webhookForm.name,
      eventType: webhookForm.eventType,
      targetUrl: webhookForm.targetUrl,
    });
    if (!data?.webhook) return;
    setWebhooks([data.webhook, ...webhooks]);
    setWebhookForm({ name: "", eventType: "task.updated", targetUrl: "" });
  }

  async function createMapping() {
    const data = await callApi("/api/integrations/mappings", "POST", {
      connectionId: mappingForm.connectionId,
      sourceObject: mappingForm.sourceObject,
      targetObject: mappingForm.targetObject,
      sourceField: mappingForm.sourceField,
      targetField: mappingForm.targetField,
      transformationRule: mappingForm.transformationRule || null,
    });
    if (data?.mapping) setActiveTab("Datenzuordnung / Mapping");
  }

  async function previewImport() {
    if (!importFile) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("importType", importType);
      const res = await fetch("/api/integrations/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import-Vorschau fehlgeschlagen");
      setPreview(data);
      const autoMapping: Record<string, string> = {};
      for (const h of data.headers as string[]) autoMapping[h] = h;
      setMapping(autoMapping);
      setImportResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import-Vorschau fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function runImport() {
    if (!preview) return;
    const data = await callApi("/api/integrations/import/run", "POST", {
      tenantId,
      importType,
      mapping,
      rows: preview.allRows ?? preview.previewRows,
    });
    if (!data) return;
    setImportResult(data);
    setSyncRuns([{
      id: String(data.runId ?? crypto.randomUUID()),
      sync_type: `csv_import_${importType}`,
      status: String(data.status ?? "success"),
      started_at: new Date().toISOString(),
      records_processed: Number(data.recordsProcessed ?? 0),
      records_created: Number(data.recordsCreated ?? 0),
      records_updated: Number(data.recordsUpdated ?? 0),
      records_failed: Number(data.recordsFailed ?? 0),
    }, ...syncRuns]);
  }

  async function triggerSync(connectionId: string) {
    const data = await callApi("/api/integrations/sync-runs", "POST", {
      tenantId,
      connectionId,
      syncType: "manual_trigger",
      direction: "bidirectional",
      status: "success",
      details: { mode: "demo", initiatedBy: "ui" },
    });
    if (!data?.run) return;
    setSyncRuns([data.run, ...syncRuns]);
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
        Mandant: <strong>{companyName}</strong> · Secrets werden maskiert angezeigt und serverseitig gehalten.
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === tab ? "bg-brand-100 text-brand-800" : "bg-white text-slate-600 hover:bg-slate-100"}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Übersicht" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => (
            <Card key={String(provider.id)}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{String(provider.name)}</CardTitle>
                  <Badge className={statusBadge(String(provider.status))}>
                    {String(provider.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-slate-600">{String(provider.description ?? "")}</p>
                <p className="text-xs text-slate-500">{String(provider.category)}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setActiveTab("Integrationsassistent")}>Verbinden</Button>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("Datenzuordnung / Mapping")}>
                    Konfigurieren
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab("Verbundene Systeme")}>
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "Verbundene Systeme" && (
        <Card>
          <CardHeader>
            <CardTitle>Verbundene Systeme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connections.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Verbindung vorhanden.</p>
            ) : (
              connections.map((c) => (
                <div
                  key={String(c.id)}
                  className={`rounded-lg border p-3 ${
                    highlightedConnectionId === String(c.id)
                      ? "border-brand-400 bg-brand-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {editingConnectionId === String(c.id) ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                            value={editingConnectionName}
                            onChange={(e) => setEditingConnectionName(e.target.value)}
                          />
                          <Button
                            size="sm"
                            disabled={loading || !editingConnectionName.trim()}
                            onClick={() => saveConnectionName(String(c.id), editingConnectionName.trim())}
                          >
                            Speichern
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingConnectionId(null)}>
                            Abbrechen
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium text-slate-800">{String(c.name)}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {String((c as { integration_providers?: { name?: string } }).integration_providers?.name ?? "")}
                        {c.base_url ? ` · ${String(c.base_url)}` : ""}
                      </p>
                    </div>
                    <Badge className={statusBadge(String(c.status))}>{String(c.status)}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => triggerSync(String(c.id))} disabled={loading}>
                      Verbindung testen
                    </Button>
                    <Button size="sm" onClick={() => triggerSync(String(c.id))} disabled={loading}>
                      Synchronisation starten
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => editConnection(String(c.id))}
                    >
                      Bearbeiten
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "Integrationsassistent" && (
        <IntegrationWizard
          tenantId={tenantId}
          providers={providers}
          onConnectionCreated={(connection) => setConnections([connection, ...connections])}
          onSyncRunCreated={(run) => setSyncRuns([run, ...syncRuns])}
          onError={setError}
          onLogTechnicalError={logTechnicalError}
          onOpenDeveloperTab={() => setActiveTab("API & Webhooks")}
          onNavigateToConnections={() => setActiveTab("Verbundene Systeme")}
          onOpenConnection={openConnection}
          onEditConnection={editConnection}
        />
      )}

      {activeTab === "Datenzuordnung / Mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Feldmapping</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Verbindung
              <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={mappingForm.connectionId} onChange={(e) => setMappingForm({ ...mappingForm, connectionId: e.target.value })}>
                <option value="">Bitte wählen</option>
                {connections.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}
              </select>
            </label>
            <label className="text-sm">Source Object<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={mappingForm.sourceObject} onChange={(e) => setMappingForm({ ...mappingForm, sourceObject: e.target.value })} placeholder="Jira Issue" /></label>
            <label className="text-sm">Target Object<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={mappingForm.targetObject} onChange={(e) => setMappingForm({ ...mappingForm, targetObject: e.target.value })} placeholder="TKND Measure" /></label>
            <label className="text-sm">Source Field<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={mappingForm.sourceField} onChange={(e) => setMappingForm({ ...mappingForm, sourceField: e.target.value })} placeholder="summary" /></label>
            <label className="text-sm">Target Field<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={mappingForm.targetField} onChange={(e) => setMappingForm({ ...mappingForm, targetField: e.target.value })} placeholder="title" /></label>
            <label className="text-sm md:col-span-2">Transformation Rule<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={mappingForm.transformationRule} onChange={(e) => setMappingForm({ ...mappingForm, transformationRule: e.target.value })} placeholder="z. B. upper(status)" /></label>
            <div className="md:col-span-2"><Button onClick={createMapping} disabled={loading}>Mapping speichern</Button></div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Synchronisationsläufe" && (
        <Card>
          <CardHeader>
            <CardTitle>Synchronisationsläufe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {syncRuns.length === 0 ? <p className="text-slate-500">Noch keine Läufe vorhanden.</p> : syncRuns.map((run) => (
              <div key={String(run.id)} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">{String(run.sync_type)}</p>
                  <Badge className={statusBadge(String(run.status))}>{String(run.status)}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(String(run.started_at)).toLocaleString("de-DE")} · verarbeitet {Number(run.records_processed ?? 0)} · erstellt {Number(run.records_created ?? 0)} · aktualisiert {Number(run.records_updated ?? 0)} · fehlgeschlagen {Number(run.records_failed ?? 0)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === "API & Webhooks" && (
        <Card>
          <CardHeader>
            <CardTitle>API & Webhooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-800">Vorbereitete REST-Endpunkte</p>
              <p className="mt-1 text-xs text-slate-600">/api/integrations/suppliers · /assets · /tasks · /risks · /incidents · /evidence · /users</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input className="rounded border border-slate-300 px-3 py-2" placeholder="Webhook-Name" value={webhookForm.name} onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })} />
              <input className="rounded border border-slate-300 px-3 py-2" placeholder="Event (z. B. task.updated)" value={webhookForm.eventType} onChange={(e) => setWebhookForm({ ...webhookForm, eventType: e.target.value })} />
              <input className="rounded border border-slate-300 px-3 py-2" placeholder="https://zielsystem/webhook" value={webhookForm.targetUrl} onChange={(e) => setWebhookForm({ ...webhookForm, targetUrl: e.target.value })} />
            </div>
            <Button onClick={createWebhook} disabled={loading || !webhookForm.name || !webhookForm.targetUrl}>Webhook speichern</Button>
            <div className="space-y-2">
              {webhooks.map((w) => (
                <div key={String(w.id)} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-800">{String(w.name)} · {String(w.event_type)}</p>
                  <p className="text-xs text-slate-500">{String(w.target_url)} · Secret: {String((w as { secret_masked?: string }).secret_masked ?? "******")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Import / Export" && (
        <Card>
          <CardHeader>
            <CardTitle>CSV / Excel Importassistent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <select className="rounded border border-slate-300 px-3 py-2" value={importType} onChange={(e) => setImportType(e.target.value as CsvImportType)}>
                {IMPORT_TYPES.map((type) => <option key={type} value={type}>{IMPORT_TYPE_LABELS[type]}</option>)}
              </select>
              <input type="file" accept=".csv,.xlsx" className="rounded border border-slate-300 px-3 py-2" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
              <Button onClick={previewImport} disabled={loading || !importFile}>Vorschau laden</Button>
            </div>

            {preview && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <p>
                  Datensätze: <strong>{preview.totalRows}</strong> · Pflichtfelder: {preview.requiredFields.join(", ")}
                </p>
                {preview.missingRequired.length > 0 && (
                  <p className="text-red-700">Fehlende Pflichtfelder: {preview.missingRequired.join(", ")}</p>
                )}
                <div className="grid gap-2 md:grid-cols-2">
                  {preview.requiredFields.map((field) => (
                    <label key={field} className="text-xs">
                      Mapping für <strong>{field}</strong>
                      <select
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                        value={Object.entries(mapping).find(([, target]) => target === field)?.[0] ?? ""}
                        onChange={(e) => setMapping({ ...mapping, [e.target.value]: field })}
                      >
                        <option value="">Spalte wählen</option>
                        {preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>{preview.headers.map((h) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.previewRows.map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          {preview.headers.map((h) => <td key={h} className="px-2 py-1">{row[h]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button onClick={runImport} disabled={loading || preview.missingRequired.length > 0}>Import starten</Button>
              </div>
            )}

            {importResult && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Ergebnis: verarbeitet {String(importResult.recordsProcessed ?? 0)}, erstellt {String(importResult.recordsCreated ?? 0)}, aktualisiert {String(importResult.recordsUpdated ?? 0)}, fehlerhaft {String(importResult.recordsFailed ?? 0)}.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "Fehlerprotokoll" && (
        <Card>
          <CardHeader><CardTitle>Fehlerprotokoll</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[...syncRuns.filter((r) => String(r.status) === "failed" || String(r.status) === "partial"), ...connections.filter((c) => Boolean(c.last_error))].slice(0, 20).map((entry, idx) => (
              <div key={idx} className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                {"sync_type" in entry
                  ? `Sync ${String(entry.sync_type)}: ${sanitizeUserFacingError(String(entry.error_message ?? "Teilweise fehlgeschlagen"))}`
                  : `Verbindung ${String(entry.name)}: ${sanitizeUserFacingError(String(entry.last_error ?? "Fehler"))}`}
              </div>
            ))}
            {syncRuns.every((r) => String(r.status) !== "failed" && String(r.status) !== "partial") &&
              connections.every((c) => !c.last_error) &&
              technicalErrorLogs.length === 0 && (
                <p className="text-slate-500">Keine Fehler vorhanden.</p>
              )}

            {technicalErrorLogs.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-800">Technische Details (nur für IT / Support)</p>
                <div className="mt-2 space-y-2">
                  {technicalErrorLogs.map((entry, idx) => (
                    <div key={`${entry.at}-${idx}`} className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-600">
                      <p>{new Date(entry.at).toLocaleString("de-DE")} · {entry.context}</p>
                      <p>Code: {entry.error_code} · Constraint: {entry.constraint}</p>
                      <p className="mt-1 break-all">{entry.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {duplicateDialog && (
        <DuplicateConnectionDialog
          payload={duplicateDialog}
          onOpenExisting={() => {
            const id = duplicateDialog.existingConnection?.id;
            setDuplicateDialog(null);
            if (id) openConnection(id);
          }}
          onEditExisting={() => {
            const id = duplicateDialog.existingConnection?.id ?? pendingRenameConnectionId;
            setDuplicateDialog(null);
            if (id) editConnection(id);
          }}
          onUseNewName={(name) => {
            setDuplicateDialog(null);
            if (pendingRenameConnectionId) {
              setEditingConnectionId(pendingRenameConnectionId);
              setEditingConnectionName(name);
              void saveConnectionName(pendingRenameConnectionId, name);
              return;
            }
            setError(`Bitte verwenden Sie den Namen „${name}“ und versuchen Sie es erneut.`);
          }}
          onClose={() => setDuplicateDialog(null)}
        />
      )}

      {activeTab === "Sicherheit & Berechtigungen" && (
        <Card>
          <CardHeader><CardTitle>Sicherheit & Berechtigungen</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Alle Verbindungen sind mandantenspezifisch über <code>tenant_id</code> getrennt.</p>
            <p>Secrets werden im Frontend maskiert; Token werden ausschließlich serverseitig verarbeitet.</p>
            <p>Für Client-Secret/Token ist eine Platzhalter-Kodierung aktiv. KMS/Vault ist als nächste Härtungsstufe vorbereitet.</p>
            <p>Webhook-Secret wird nie im Klartext wieder ausgeliefert.</p>
            <p>Empfehlung: produktiv OAuth-Scopes minimal halten und rotierende API-Keys nutzen.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
