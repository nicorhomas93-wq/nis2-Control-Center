"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2 } from "lucide-react";

interface DeleteConfirmModalProps {
  open: boolean;
  title?: string;
  itemName: string;
  dependencyWarning?: string | null;
  confirmLabel?: string;
  requireTyping?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  open,
  title = "Eintrag wirklich löschen?",
  itemName,
  dependencyWarning,
  confirmLabel = "Löschen bestätigen",
  requireTyping,
  loading = false,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open, itemName, requireTyping]);

  if (!open) return null;

  const canConfirm = !requireTyping || typed === requireTyping;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <h2 id="delete-modal-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Diese Aktion kann nicht ohne Weiteres rückgängig gemacht werden.
        </p>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
          {itemName}
        </p>
        {dependencyWarning && (
          <p className="mt-3 text-sm text-amber-800">{dependencyWarning}</p>
        )}
        {requireTyping && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-slate-600">
              Bitte geben Sie <strong>{requireTyping}</strong> ein, um den Vorgang zu bestätigen.
            </p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            disabled={!canConfirm || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Bitte warten…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RestoreConfirmModalProps {
  open: boolean;
  itemName: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (restoreRelated: boolean) => void;
}

export function RestoreConfirmModal({
  open,
  itemName,
  loading = false,
  onCancel,
  onConfirm,
}: RestoreConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Eintrag wiederherstellen?</h2>
        <p className="mt-2 text-sm text-slate-600">{itemName}</p>
        <p className="mt-3 text-sm text-slate-700">
          Zugehörige Daten ebenfalls wiederherstellen?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onConfirm(false)}
            disabled={loading}
          >
            Nur diesen Eintrag
          </Button>
          <Button type="button" onClick={() => onConfirm(true)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mit zugehörigen Daten"}
          </Button>
        </div>
      </div>
    </div>
  );
}
