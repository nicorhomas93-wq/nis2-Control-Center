"use client";

import Link from "next/link";
import { useState } from "react";
import type { Document } from "@/lib/types";
import { calculateAuditFolderScore, getMissingAuditDocumentTypes } from "@/lib/audit/audit-folders";
import { PilotRequestModal } from "@/components/marketing/PilotRequestModal";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { CheckCircle2, Download, FolderArchive, Loader2, Plus } from "lucide-react";

interface DashboardActionsProps {
  companyId: string;
  companyName?: string;
  documents: Document[];
  missingCount: number;
  auditScorePercent: number;
}

export function DashboardActions({
  companyId,
  companyName,
  documents,
  missingCount,
  auditScorePercent,
}: DashboardActionsProps) {
  const [pilotOpen, setPilotOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateMissing() {
    const missing = getMissingAuditDocumentTypes(documents);
    if (missing.length === 0) return;

    setBatchLoading(true);
    setError(null);

    for (let i = 0; i < missing.length; i++) {
      setBatchMsg(`Dokument ${i + 1} von ${missing.length} wird erstellt…`);
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, documentType: missing[i] }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Generierung fehlgeschlagen");
        setBatchLoading(false);
        setBatchMsg(null);
        return;
      }
    }

    setBatchMsg(null);
    setBatchLoading(false);
    window.location.reload();
  }

  return (
    <>
      <PilotRequestModal
        open={pilotOpen}
        onClose={() => setPilotOpen(false)}
        defaultMessage="Pilot-Onboarding / Support-Anfrage über Dashboard"
      />

      {auditScorePercent === 100 && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Audit-Ordner vollständig vorbereitet.
        </div>
      )}

      {missingCount > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="flex gap-4 pt-6 flex-row items-center justify-between">
            <div>
              <p className="font-medium text-amber-900">
                {missingCount} Dokument{missingCount === 1 ? "" : "e"} fehlen im Audit-Ordner
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Audit-Score: {auditScorePercent} %
              </p>
            </div>
            <Button
              variant="outline"
              disabled={batchLoading}
              onClick={handleGenerateMissing}
            >
              {batchLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {batchMsg}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Fehlende Dokumente generieren
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/audit">
          <Button variant="outline">
            <Download className="h-4 w-4" /> Audit-Paket herunterladen
          </Button>
        </Link>
        <Link href="/audit">
          <Button variant="outline">
            <FolderArchive className="h-4 w-4" /> Audit-Ordner öffnen
          </Button>
        </Link>
        <Button variant="outline" onClick={() => setPilotOpen(true)}>
          Pilot-Onboarding buchen
        </Button>
      </div>

      {error && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
    </>
  );
}
