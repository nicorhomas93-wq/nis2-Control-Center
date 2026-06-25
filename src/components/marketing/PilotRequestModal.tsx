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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pilotzugang anfragen</h2>
            <p className="mt-1 text-sm text-slate-500">
              Wir melden uns mit den nächsten Schritten für Ihren Pilotzugang.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <PilotRequestForm
          defaultMessage={defaultMessage}
          onSuccess={({ emailSent }) => {
            if (emailSent) {
              setTimeout(onClose, 4000);
            }
          }}
        />
      </div>
    </div>
  );
}
