"use client";

import type { IncidentActionItem } from "@/lib/incidents/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Plus, Trash2 } from "lucide-react";

interface IncidentActionsEditorProps {
  title: string;
  actions: IncidentActionItem[];
  onChange: (actions: IncidentActionItem[]) => void;
  onLoadTemplates?: () => void;
}

export function IncidentActionsEditor({
  title,
  actions,
  onChange,
  onLoadTemplates,
}: IncidentActionsEditorProps) {
  function updateAction(id: string, patch: Partial<IncidentActionItem>) {
    onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeAction(id: string) {
    onChange(actions.filter((a) => a.id !== id));
  }

  function addAction() {
    onChange([
      ...actions,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        responsible: "",
        deadline: null,
        status: "open",
        evidence: "",
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="flex gap-2">
          {onLoadTemplates && (
            <Button type="button" size="sm" variant="outline" onClick={onLoadTemplates}>
              Vorlagen laden
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={addAction}>
            <Plus className="h-3 w-3" /> Maßnahme
          </Button>
        </div>
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {actions.length === 0 && (
          <p className="text-sm text-slate-500">Noch keine Maßnahmen dokumentiert.</p>
        )}
        {actions.map((action) => (
          <div key={action.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <Input
                value={action.title}
                onChange={(e) => updateAction(action.id, { title: e.target.value })}
                placeholder="Titel der Maßnahme"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => removeAction(action.id)}
                aria-label="Maßnahme entfernen"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs">Beschreibung</Label>
                <Textarea
                  rows={2}
                  value={action.description}
                  onChange={(e) => updateAction(action.id, { description: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Verantwortlich</Label>
                <Input
                  value={action.responsible}
                  onChange={(e) => updateAction(action.id, { responsible: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Frist</Label>
                <Input
                  type="datetime-local"
                  value={action.deadline?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    updateAction(action.id, {
                      deadline: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={action.status}
                  onChange={(e) =>
                    updateAction(action.id, {
                      status: e.target.value as IncidentActionItem["status"],
                    })
                  }
                >
                  <option value="open">Offen</option>
                  <option value="in_progress">In Bearbeitung</option>
                  <option value="completed">Abgeschlossen</option>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nachweis / Evidenz</Label>
                <Input
                  value={action.evidence}
                  onChange={(e) => updateAction(action.id, { evidence: e.target.value })}
                  placeholder="Ticket, Log, Link …"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
