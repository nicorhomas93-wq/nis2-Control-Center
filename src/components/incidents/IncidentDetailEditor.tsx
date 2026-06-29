"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Incident } from "@/lib/types";
import {
  formStateToPayload,
  incidentToFormState,
  INCIDENT_PRIORITY_OPTIONS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_OPTIONS,
  type IncidentFormState,
} from "@/lib/incidents/types";
import { validateIncidentCompletion } from "@/lib/incidents/completion";
import { buildGeneratedDocuments } from "@/lib/incidents/artifacts";
import {
  CONTAINMENT_ACTION_TITLES,
  CORRECTIVE_ACTION_TITLES,
  PREVENTIVE_ACTION_TITLES,
  createActionsFromTitles,
} from "@/lib/incidents/templates";
import { IncidentActionsEditor } from "@/components/incidents/IncidentActionsEditor";
import { resolveObligationStatus } from "@/lib/compliance/obligations";
import { OBLIGATION_STATUS_LABELS } from "@/lib/compliance/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FileText, Loader2 } from "lucide-react";

interface IncidentDetailEditorProps {
  incident: Incident;
  companyName?: string;
  onSaved: (incident: Incident) => void;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[32rem] space-y-4 overflow-y-auto">{children}</CardContent>
    </Card>
  );
}

export function IncidentDetailEditor({
  incident,
  companyName,
  onSaved,
}: IncidentDetailEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<IncidentFormState>(() => incidentToFormState(incident));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setForm(incidentToFormState(incident));
    setFeedback(null);
    setValidationErrors([]);
  }, [incident]);

  function patchForm(patch: Partial<IncidentFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const obligation = resolveObligationStatus({
    status: form.status,
    deadline: form.dueDate || incident.deadline,
    criticality: form.priority,
    isMandatory: incident.is_mandatory,
  });

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    setValidationErrors([]);

    if (form.status === "completed") {
      const validation = validateIncidentCompletion(form);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setFeedback({
          type: "error",
          text: "Speichern fehlgeschlagen — Pflichtangaben für Abschluss unvollständig.",
        });
        setSaving(false);
        return;
      }
    }

    const payload = { id: incident.id, ...formStateToPayload(form) };
    console.log("Incident save payload:", payload);

    try {
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Incident save failed:", data);
        const message =
          data.validation_errors?.join(" ") ||
          data.error ||
          "Speichern fehlgeschlagen";
        setValidationErrors(data.validation_errors ?? []);
        setFeedback({
          type: "error",
          text: message.includes("Berechtigung") ? message : "Speichern fehlgeschlagen",
        });
        setSaving(false);
        return;
      }

      console.log("Incident saved:", data.incident);
      setFeedback({ type: "success", text: "Vorfall gespeichert" });
      onSaved(data.incident as Incident);
      router.refresh();
    } catch (error) {
      console.error("Incident save failed:", error);
      setFeedback({ type: "error", text: "Speichern fehlgeschlagen" });
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateArtifacts() {
    setGenerating(true);
    setFeedback(null);

    const docs = buildGeneratedDocuments(incident, form, companyName);
    const management = docs.find((d) => d.type === "management_report")?.content ?? "";
    const audit = docs.find((d) => d.type === "audit_report")?.content ?? "";
    const letter = docs.find((d) => d.type === "employee_letter")?.content ?? "";

    patchForm({
      managementReportText: management,
      auditReportText: audit,
      employeeLetterText: letter || form.employeeLetterText,
    });

    const payload = {
      id: incident.id,
      ...formStateToPayload({
        ...form,
        managementReportText: management,
        auditReportText: audit,
        employeeLetterText: letter || form.employeeLetterText,
      }),
      generated_documents: docs,
    };

    try {
      const res = await fetch("/api/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Artifact generation failed:", data);
        setFeedback({ type: "error", text: "Speichern fehlgeschlagen" });
        setGenerating(false);
        return;
      }
      console.log("Incident artifacts generated:", data.incident);
      setFeedback({ type: "success", text: "Dokumente erzeugt und gespeichert" });
      onSaved(data.incident as Incident);
      router.refresh();
    } catch (error) {
      console.error("Artifact generation failed:", error);
      setFeedback({ type: "error", text: "Speichern fehlgeschlagen" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Pflicht & Bearbeitung</p>
          <Badge>
            {OBLIGATION_STATUS_LABELS[obligation]} · {INCIDENT_STATUS_LABELS[form.status]}
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`status-${incident.id}`}>Bearbeitungsstatus</Label>
            <Select
              id={`status-${incident.id}`}
              value={form.status}
              onChange={(e) =>
                patchForm({ status: e.target.value as IncidentFormState["status"] })
              }
            >
              {INCIDENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`priority-${incident.id}`}>Priorität</Label>
            <Select
              id={`priority-${incident.id}`}
              value={form.priority}
              onChange={(e) => patchForm({ priority: e.target.value })}
            >
              {INCIDENT_PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`due-${incident.id}`}>Dokumentationsfrist</Label>
            <Input
              id={`due-${incident.id}`}
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => patchForm({ dueDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`assigned-${incident.id}`}>Verantwortlich</Label>
            <Input
              id={`assigned-${incident.id}`}
              value={form.assignedTo}
              onChange={(e) => patchForm({ assignedTo: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`escalation-${incident.id}`}>Eskalationsstufe</Label>
            <Input
              id={`escalation-${incident.id}`}
              type="number"
              min={0}
              max={5}
              value={form.escalationLevel}
              onChange={(e) => patchForm({ escalationLevel: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={handleSave} disabled={saving || generating}>
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Speichere...
              </>
            ) : (
              "Status speichern"
            )}
          </Button>
        </div>
      </div>

      <SectionCard title="Vorfallklärung">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Kurzbeschreibung</Label>
            <Textarea
              rows={3}
              value={form.incidentSummary}
              onChange={(e) => patchForm({ incidentSummary: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Ursache / Root Cause</Label>
            <Textarea
              rows={3}
              value={form.rootCause}
              onChange={(e) => patchForm({ rootCause: e.target.value })}
            />
          </div>
          <div>
            <Label>Betroffene Assets</Label>
            <Textarea
              rows={2}
              value={form.affectedAssets}
              onChange={(e) => patchForm({ affectedAssets: e.target.value })}
            />
          </div>
          <div>
            <Label>Betroffene Systeme</Label>
            <Textarea
              rows={2}
              value={form.affectedSystems}
              onChange={(e) => patchForm({ affectedSystems: e.target.value })}
            />
          </div>
          <div>
            <Label>Betroffene Personen</Label>
            <Textarea
              rows={2}
              value={form.affectedPersons}
              onChange={(e) => patchForm({ affectedPersons: e.target.value })}
            />
          </div>
          <div>
            <Label>Datenkategorien</Label>
            <Textarea
              rows={2}
              value={form.dataCategories}
              onChange={(e) => patchForm({ dataCategories: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Geschätzte Auswirkung</Label>
            <Textarea
              rows={2}
              value={form.estimatedImpact}
              onChange={(e) => patchForm({ estimatedImpact: e.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Sofortmaßnahmen">
        <IncidentActionsEditor
          title="Containment"
          actions={form.containmentActions}
          onChange={(containmentActions) => patchForm({ containmentActions })}
          onLoadTemplates={() =>
            patchForm({
              containmentActions: createActionsFromTitles(CONTAINMENT_ACTION_TITLES),
            })
          }
        />
      </SectionCard>

      <SectionCard title="Korrekturmaßnahmen">
        <IncidentActionsEditor
          title="Corrective Actions"
          actions={form.correctiveActions}
          onChange={(correctiveActions) => patchForm({ correctiveActions })}
          onLoadTemplates={() =>
            patchForm({
              correctiveActions: createActionsFromTitles(CORRECTIVE_ACTION_TITLES),
            })
          }
        />
      </SectionCard>

      <SectionCard title="Präventivmaßnahmen">
        <IncidentActionsEditor
          title="Preventive Actions"
          actions={form.preventiveActions}
          onChange={(preventiveActions) => patchForm({ preventiveActions })}
          onLoadTemplates={() =>
            patchForm({
              preventiveActions: createActionsFromTitles(PREVENTIVE_ACTION_TITLES),
            })
          }
        />
      </SectionCard>

      <SectionCard title="Kommunikation & Schreiben">
        <div className="space-y-4">
          <Checkbox
            id={`comm-${incident.id}`}
            label="Externe / interne Kommunikation erforderlich"
            checked={form.communicationRequired}
            onChange={(e) => patchForm({ communicationRequired: e.target.checked })}
          />
          <Checkbox
            id={`letter-${incident.id}`}
            label="Schreiben an Mitarbeiter/Ex-Mitarbeiter erforderlich"
            checked={form.employeeLetterRequired}
            onChange={(e) => patchForm({ employeeLetterRequired: e.target.checked })}
          />
          {form.employeeLetterRequired && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Empfängername</Label>
                <Input
                  value={form.employeeRecipientName}
                  onChange={(e) => patchForm({ employeeRecipientName: e.target.value })}
                />
              </div>
              <div>
                <Label>E-Mail</Label>
                <Input
                  type="email"
                  value={form.employeeRecipientEmail}
                  onChange={(e) => patchForm({ employeeRecipientEmail: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Mitarbeiterschreiben</Label>
                <Textarea
                  rows={6}
                  value={form.employeeLetterText}
                  onChange={(e) => patchForm({ employeeLetterText: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Dokumente & Abschluss">
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateArtifacts}
            disabled={saving || generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Erzeuge Dokumente...
              </>
            ) : (
              <>
                <FileText className="h-3 w-3" /> Dokumente erzeugen
              </>
            )}
          </Button>
          <div>
            <Label>Management-Report</Label>
            <Textarea
              rows={5}
              value={form.managementReportText}
              onChange={(e) => patchForm({ managementReportText: e.target.value })}
            />
          </div>
          <div>
            <Label>Audit-Nachweis</Label>
            <Textarea
              rows={5}
              value={form.auditReportText}
              onChange={(e) => patchForm({ auditReportText: e.target.value })}
            />
          </div>
          <div>
            <Label>Nachweise / Links</Label>
            <Textarea
              rows={2}
              value={form.evidenceLinks}
              onChange={(e) => patchForm({ evidenceLinks: e.target.value })}
              placeholder="Ticket-URLs, Log-Pfade, Screenshots …"
            />
          </div>
          <div>
            <Label>Abschlussnotizen</Label>
            <Textarea
              rows={3}
              value={form.completionNotes}
              onChange={(e) => patchForm({ completionNotes: e.target.value })}
            />
          </div>
          <div>
            <Label>Abgeschlossen von</Label>
            <Input
              value={form.completedBy}
              onChange={(e) => patchForm({ completedBy: e.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Button onClick={handleSave} disabled={saving || generating}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Speichere...
            </>
          ) : (
            "Vorfall speichern"
          )}
        </Button>
        {feedback && (
          <p
            className={`text-sm ${feedback.type === "success" ? "text-emerald-700" : "text-red-700"}`}
            role="alert"
          >
            {feedback.text}
          </p>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Für Abschluss fehlen noch:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
