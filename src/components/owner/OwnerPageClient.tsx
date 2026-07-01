"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CRITICAL_ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  getDependencyWarning,
  type OwnerEntityType,
  type TrashItem,
} from "@/lib/owner/types";
import { DeleteConfirmModal, RestoreConfirmModal } from "@/components/owner/DeleteConfirmModal";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Loader2, Trash2 } from "lucide-react";

interface CompanyRow {
  id: string;
  company_name: string | null;
  is_mandant: boolean;
  is_demo?: boolean;
}

interface OwnerDataResponse {
  companies: CompanyRow[];
  risks?: Array<{ id: string; asset: string; threat: string }>;
  measures?: Array<{ id: string; title: string }>;
  documents?: Array<{ id: string; title: string }>;
  incidents?: Array<{ id: string; title: string }>;
  auditExports?: Array<{ id: string; created_at: string }>;
}

interface PendingDelete {
  entityType: OwnerEntityType;
  entityId: string;
  itemName: string;
  mode: "soft" | "purge";
}

interface PendingRestore {
  item: TrashItem;
}

function EntityRow({
  label,
  entityType,
  entityId,
  onDelete,
}: {
  label: string;
  entityType: OwnerEntityType;
  entityId: string;
  onDelete: (entityType: OwnerEntityType, entityId: string, itemName: string) => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
      <span className="min-w-0 truncate text-slate-800">{label}</span>
      <button
        type="button"
        onClick={() => onDelete(entityType, entityId, label)}
        className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
      >
        Löschen
      </button>
    </div>
  );
}

export function OwnerPageClient() {
  const router = useRouter();
  const [tab, setTab] = useState<"manage" | "trash">("manage");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [data, setData] = useState<OwnerDataResponse | null>(null);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    const res = await fetch("/api/owner/data");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Laden fehlgeschlagen");
    setCompanies(json.companies ?? []);
    if (!selectedCompanyId && json.companies?.[0]?.id) {
      setSelectedCompanyId(json.companies[0].id);
    }
  }, [selectedCompanyId]);

  const loadCompanyData = useCallback(async (companyId: string) => {
    if (!companyId) return;
    const res = await fetch(`/api/owner/data?companyId=${companyId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Laden fehlgeschlagen");
    setData(json);
  }, []);

  const loadTrash = useCallback(async () => {
    const res = await fetch("/api/owner/trash");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Papierkorb konnte nicht geladen werden");
    setTrash(json.items ?? []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadCompanies();
      if (selectedCompanyId) await loadCompanyData(selectedCompanyId);
      await loadTrash();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [loadCompanies, loadCompanyData, loadTrash, selectedCompanyId]);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      void loadCompanyData(selectedCompanyId).catch((e) =>
        setError(e instanceof Error ? e.message : "Fehler")
      );
    }
  }, [selectedCompanyId, loadCompanyData]);

  function openDelete(entityType: OwnerEntityType, entityId: string, itemName: string) {
    setPendingDelete({ entityType, entityId, itemName, mode: "soft" });
  }

  function openPurge(item: TrashItem) {
    setPendingDelete({
      entityType: item.entityType,
      entityId: item.id,
      itemName: item.title,
      mode: "purge",
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setActionLoading(true);
    setError(null);

    const endpoint = pendingDelete.mode === "purge" ? "/api/owner/purge" : "/api/owner/delete";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: pendingDelete.entityType,
        entityId: pendingDelete.entityId,
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Löschen fehlgeschlagen");
      setActionLoading(false);
      return;
    }

    setFeedback(
      pendingDelete.mode === "purge" ? "Endgültig gelöscht." : "In den Papierkorb verschoben."
    );
    setPendingDelete(null);
    setActionLoading(false);
    router.refresh();
    await refresh();
  }

  async function confirmRestore(restoreRelated: boolean) {
    if (!pendingRestore) return;
    setActionLoading(true);
    const res = await fetch("/api/owner/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: pendingRestore.item.entityType,
        entityId: pendingRestore.item.id,
        restoreRelated,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Wiederherstellen fehlgeschlagen");
      setActionLoading(false);
      return;
    }
    setFeedback("Wiederhergestellt.");
    setPendingRestore(null);
    setActionLoading(false);
    router.refresh();
    await refresh();
  }

  async function handleCleanupTestData() {
    setActionLoading(true);
    setError(null);
    const res = await fetch("/api/owner/cleanup-test-data", { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Bereinigung fehlgeschlagen");
      setActionLoading(false);
      return;
    }
    setFeedback(`${json.deleted ?? 0} Test-Unternehmen in den Papierkorb verschoben.`);
    setActionLoading(false);
    router.refresh();
    await refresh();
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "manage" ? "primary" : "outline"}
          size="sm"
          onClick={() => setTab("manage")}
        >
          Datenverwaltung
        </Button>
        <Button
          variant={tab === "trash" ? "primary" : "outline"}
          size="sm"
          onClick={() => setTab("trash")}
        >
          Gelöschte Elemente ({trash.length})
        </Button>
      </div>

      {feedback && <p className="text-sm text-emerald-700">{feedback}</p>}
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {tab === "manage" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Testdaten bereinigen</CardTitle>
              <CardDescription>
                Verschiebt nur Unternehmen mit Kennzeichnung <code>is_demo = true</code> in den
                Papierkorb.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleCleanupTestData}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Testdaten bereinigen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspace auswählen</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name ?? "Unbenannt"}
                    {c.is_mandant ? " (Mandant)" : ""}
                    {c.is_demo ? " [Demo]" : ""}
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>

          {loading ? (
            <p className="text-sm text-slate-500">Lade Daten…</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Unternehmen / Mandanten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {companies.map((c) => (
                    <EntityRow
                      key={c.id}
                      label={`${c.company_name ?? "Unbenannt"}${c.is_mandant ? " (Mandant)" : ""}`}
                      entityType={c.is_mandant ? "mandant" : "company"}
                      entityId={c.id}
                      onDelete={openDelete}
                    />
                  ))}
                </CardContent>
              </Card>

              {selectedCompany && data && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Risiken</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-64 space-y-2 overflow-y-auto">
                      {(data.risks ?? []).map((r) => (
                        <EntityRow
                          key={r.id}
                          label={`${r.asset}: ${r.threat}`}
                          entityType="risk"
                          entityId={r.id}
                          onDelete={openDelete}
                        />
                      ))}
                      {(data.risks ?? []).length === 0 && (
                        <p className="text-sm text-slate-500">Keine Risiken</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Maßnahmen</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-64 space-y-2 overflow-y-auto">
                      {(data.measures ?? []).map((m) => (
                        <EntityRow
                          key={m.id}
                          label={m.title}
                          entityType="measure"
                          entityId={m.id}
                          onDelete={openDelete}
                        />
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Dokumente</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-64 space-y-2 overflow-y-auto">
                      {(data.documents ?? []).map((d) => (
                        <EntityRow
                          key={d.id}
                          label={d.title}
                          entityType="document"
                          entityId={d.id}
                          onDelete={openDelete}
                        />
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sicherheitsvorfälle</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-64 space-y-2 overflow-y-auto">
                      {(data.incidents ?? []).map((i) => (
                        <EntityRow
                          key={i.id}
                          label={i.title}
                          entityType="incident"
                          entityId={i.id}
                          onDelete={openDelete}
                        />
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Audit-Exporte</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-64 space-y-2 overflow-y-auto">
                      {(data.auditExports ?? []).map((a) => (
                        <EntityRow
                          key={a.id}
                          label={`Audit-Export ${formatDate(a.created_at)}`}
                          entityType="audit_export"
                          entityId={a.id}
                          onDelete={openDelete}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </>
      )}

      {tab === "trash" && (
        <Card>
          <CardHeader>
            <CardTitle>Gelöschte Elemente</CardTitle>
            <CardDescription>Papierkorb — Wiederherstellen oder endgültig löschen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {trash.length === 0 && (
              <p className="text-sm text-slate-500">Keine gelöschten Elemente.</p>
            )}
            {trash.map((item) => (
              <div
                key={`${item.entityType}-${item.id}`}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-slate-500">
                    {ENTITY_TYPE_LABELS[item.entityType]} · {item.companyName} · gelöscht am{" "}
                    {formatDate(item.deletedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (item.entityType === "company" || item.entityType === "mandant") {
                        setPendingRestore({ item });
                      } else {
                        void (async () => {
                          setActionLoading(true);
                          const res = await fetch("/api/owner/restore", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              entityType: item.entityType,
                              entityId: item.id,
                              restoreRelated: false,
                            }),
                          });
                          const json = await res.json();
                          if (!res.ok) {
                            setError(json.error ?? "Wiederherstellen fehlgeschlagen");
                          } else {
                            setFeedback("Wiederhergestellt.");
                            await refresh();
                            router.refresh();
                          }
                          setActionLoading(false);
                        })();
                      }
                    }}
                  >
                    Wiederherstellen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => openPurge(item)}
                  >
                    Endgültig löschen
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DeleteConfirmModal
        open={Boolean(pendingDelete)}
        itemName={pendingDelete?.itemName ?? ""}
        dependencyWarning={
          pendingDelete ? getDependencyWarning(pendingDelete.entityType) : null
        }
        requireTyping={
          pendingDelete?.mode === "purge"
            ? "ENDGÜLTIG LÖSCHEN"
            : pendingDelete && CRITICAL_ENTITY_TYPES.includes(pendingDelete.entityType)
              ? "LÖSCHEN"
              : undefined
        }
        confirmLabel={
          pendingDelete?.mode === "purge" ? "Endgültig löschen" : "Löschen bestätigen"
        }
        title={
          pendingDelete?.mode === "purge"
            ? "Endgültig löschen?"
            : "Eintrag wirklich löschen?"
        }
        loading={actionLoading}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <RestoreConfirmModal
        open={Boolean(pendingRestore)}
        itemName={pendingRestore?.item.title ?? ""}
        loading={actionLoading}
        onCancel={() => setPendingRestore(null)}
        onConfirm={confirmRestore}
      />
    </div>
  );
}
