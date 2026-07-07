"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  buildConnectionCardViewModel,
  type ConnectionAction,
} from "@/lib/integrations/connection-display";

interface ConnectedSystemCardProps {
  connection: Record<string, unknown>;
  syncRuns: Record<string, unknown>[];
  highlighted: boolean;
  editing: boolean;
  editingName: string;
  loading: boolean;
  onEditingNameChange: (name: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onAction: (action: ConnectionAction, connectionId: string) => void;
}

export function ConnectedSystemCard({
  connection,
  syncRuns,
  highlighted,
  editing,
  editingName,
  loading,
  onEditingNameChange,
  onSaveName,
  onCancelEdit,
  onAction,
}: ConnectedSystemCardProps) {
  const view = buildConnectionCardViewModel(connection, syncRuns);
  const isMicrosoft = view.providerKey === "microsoft365";

  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-md ${
        highlighted ? "border-brand-400 ring-1 ring-brand-200" : "border-slate-200"
      } ${isMicrosoft ? "bg-gradient-to-br from-white to-slate-50" : ""}`}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {editing ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                  value={editingName}
                  onChange={(e) => onEditingNameChange(e.target.value)}
                />
                <Button size="sm" disabled={loading || !editingName.trim()} onClick={onSaveName}>
                  Speichern
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  Abbrechen
                </Button>
              </div>
            ) : (
              <h3 className="text-lg font-semibold text-slate-900">{view.name}</h3>
            )}
            <p className="text-sm text-slate-600">{view.typeLabel}</p>
            {isMicrosoft && (
              <p className="text-sm leading-relaxed text-slate-700">{view.description}</p>
            )}
          </div>
          <Badge className={view.statusBadgeClass}>{view.statusLabel}</Badge>
        </div>

        <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {view.statusHint}
        </p>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {view.systemAddress && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Systemadresse</p>
              <p className="mt-0.5 break-all text-slate-800">{view.systemAddress}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Letzte Synchronisation</p>
            <p className="mt-0.5 text-slate-800">{view.lastSyncLabel}</p>
          </div>
        </div>

        {view.discoveredData.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Erkannte Daten</p>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-800">
              {view.discoveredData.map((item) => (
                <li key={item.label}>
                  · {item.value} {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Nächster Schritt</p>
          <p className="mt-0.5 text-sm font-medium text-brand-900">{view.nextActionLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button
            size="sm"
            disabled={loading}
            onClick={() => onAction(view.primaryAction.id, view.id)}
          >
            {view.primaryAction.label}
          </Button>
          {view.secondaryActions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => onAction(action.id, view.id)}
            >
              {action.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={() => onAction(view.settingsAction.id, view.id)}
          >
            {view.settingsAction.label}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
