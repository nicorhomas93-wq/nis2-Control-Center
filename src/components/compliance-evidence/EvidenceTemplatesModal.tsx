"use client";

import type { Nis2EvidenceScope } from "@/lib/compliance-evidence/types";
import { EVIDENCE_TEMPLATES, getTemplateScopeLabel } from "@/lib/compliance-evidence/templates";
import { EVIDENCE_CATEGORY_LABELS, EVIDENCE_ENTRY_TYPE_LABELS } from "@/lib/compliance-evidence/labels";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Loader2, X } from "lucide-react";

interface EvidenceTemplatesModalProps {
  open: boolean;
  scope: Nis2EvidenceScope;
  loadingKey: string | null;
  onClose: () => void;
  onSelect: (templateKey: string) => void;
}

export function EvidenceTemplatesModal({
  open,
  scope,
  loadingKey,
  onClose,
  onSelect,
}: EvidenceTemplatesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Vorlage hinzufügen</h2>
            <p className="text-sm text-slate-500">
              Standardvorlagen für Schulungen, Phishing, MFA, Backup und mehr
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-6">
          {EVIDENCE_TEMPLATES.map((template) => (
            <div
              key={template.key}
              className="rounded-xl border border-slate-200 p-4 hover:border-brand-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{template.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className="bg-slate-100 text-slate-700">
                      {EVIDENCE_CATEGORY_LABELS[template.category]}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700">
                      {EVIDENCE_ENTRY_TYPE_LABELS[template.entryType]}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      {getTemplateScopeLabel(scope)}
                    </Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={loadingKey === template.key}
                  onClick={() => onSelect(template.key)}
                >
                  {loadingKey === template.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Vorlage verwenden
                </Button>
              </div>
              <ul className="mt-3 list-inside list-disc text-sm text-slate-600">
                {template.recommendedFiles.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
