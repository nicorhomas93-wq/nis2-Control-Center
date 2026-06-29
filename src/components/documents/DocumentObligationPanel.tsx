"use client";

import { useState } from "react";
import type { Document } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { resolveObligationStatus } from "@/lib/compliance/obligations";
import { OBLIGATION_STATUS_LABELS } from "@/lib/compliance/types";

interface DocumentObligationPanelProps {
  document: Document;
  onUpdated?: (doc: Document) => void;
}

export function DocumentObligationPanel({ document: doc, onUpdated }: DocumentObligationPanelProps) {
  const [isMandatory, setIsMandatory] = useState(Boolean(doc.is_mandatory));
  const [criticality, setCriticality] = useState(doc.criticality ?? "medium");
  const [deadline, setDeadline] = useState(doc.deadline?.slice(0, 10) ?? "");
  const [escalationLevel, setEscalationLevel] = useState(String(doc.escalation_level ?? 0));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const obligation = resolveObligationStatus({
    status: doc.status === "published" ? "completed" : "open",
    deadline: deadline || doc.deadline,
    criticality,
    isMandatory,
  });

  const obligationClass =
    obligation === "critically_overdue"
      ? "bg-red-100 text-red-800"
      : obligation === "overdue"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: doc.id,
        is_mandatory: isMandatory,
        criticality,
        deadline: deadline || null,
        escalation_level: Number(escalationLevel) || 0,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Speichern fehlgeschlagen");
      return;
    }
    setMessage("Gespeichert");
    onUpdated?.({
      ...doc,
      is_mandatory: isMandatory,
      criticality,
      deadline: deadline || null,
      escalation_level: Number(escalationLevel) || 0,
    });
  }

  return (
    <div className="no-print mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Pflicht & Fristen</p>
        <Badge className={obligationClass}>{OBLIGATION_STATUS_LABELS[obligation]}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2">
          <input
            id={`mandatory-${doc.id}`}
            type="checkbox"
            checked={isMandatory}
            onChange={(e) => setIsMandatory(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <Label htmlFor={`mandatory-${doc.id}`}>Pflichtdokument</Label>
        </div>
        <div>
          <Label htmlFor={`crit-${doc.id}`}>Kritikalität</Label>
          <Select
            id={`crit-${doc.id}`}
            value={criticality}
            onChange={(e) => setCriticality(e.target.value)}
          >
            <option value="low">Niedrig</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch</option>
            <option value="critical">Kritisch</option>
          </Select>
        </div>
        <div>
          <Label htmlFor={`deadline-${doc.id}`}>Gültig bis / Frist</Label>
          <Input
            id={`deadline-${doc.id}`}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`esc-${doc.id}`}>Eskalationsstufe</Label>
          <Input
            id={`esc-${doc.id}`}
            type="number"
            min={0}
            max={5}
            value={escalationLevel}
            onChange={(e) => setEscalationLevel(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Speichern…" : "Pflichtfelder speichern"}
        </Button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </div>
  );
}
