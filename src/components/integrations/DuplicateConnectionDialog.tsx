"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { DuplicateConnectionErrorPayload } from "@/lib/integrations/connection-errors";

interface DuplicateConnectionDialogProps {
  payload: DuplicateConnectionErrorPayload;
  onOpenExisting: () => void;
  onEditExisting: () => void;
  onUseNewName: (name: string) => void;
  onClose: () => void;
}

export function DuplicateConnectionDialog({
  payload,
  onOpenExisting,
  onEditExisting,
  onUseNewName,
  onClose,
}: DuplicateConnectionDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <Card className="w-full max-w-lg border-amber-200 shadow-xl">
        <CardHeader>
          <CardTitle className="text-amber-900">{payload.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-700">{payload.message}</p>
          <p className="text-sm font-medium text-amber-800">{payload.shortMessage}</p>

          {payload.suggestedNames.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-slate-600">Vorschläge für einen neuen Namen:</p>
              <div className="flex flex-wrap gap-2">
                {payload.suggestedNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm text-brand-800 hover:bg-brand-100"
                    onClick={() => onUseNewName(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {payload.existingConnection && (
              <Button onClick={onOpenExisting}>Bestehende Verbindung öffnen</Button>
            )}
            {payload.existingConnection && (
              <Button variant="outline" onClick={onEditExisting}>
                Verbindung bearbeiten
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                const next = payload.suggestedNames[0];
                if (next) onUseNewName(next);
                else onClose();
              }}
            >
              Neuen Namen verwenden
            </Button>
          </div>

          <button type="button" className="text-sm text-slate-500 underline" onClick={onClose}>
            Schließen
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
