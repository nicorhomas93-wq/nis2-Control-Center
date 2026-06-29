"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";

interface PilotRequestModalProps {
  open: boolean;
  onClose: () => void;
  defaultMessage?: string;
}

export function PilotRequestModal({ open, onClose, defaultMessage }: PilotRequestModalProps) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pilot-request-title"
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div className="relative z-10 flex w-full max-h-[90vh] flex-col overflow-hidden rounded-xl bg-white shadow-xl max-w-xl">
          <div className="shrink-0 border-b border-slate-100 py-4 px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <h2 id="pilot-request-title" className="text-lg font-bold text-slate-900">
                  Pilotzugang anfragen
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Wir melden uns mit den nächsten Schritten für Ihren Pilotzugang.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <PilotRequestForm
              defaultMessage={defaultMessage}
              layout="modal"
              onSuccess={({ emailSent }) => {
                if (emailSent) {
                  setTimeout(onClose, 4000);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
