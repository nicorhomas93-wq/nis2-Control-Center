"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DOCUMENT_TYPES } from "@/lib/nis2/document-types";
import type { Document, DocumentType } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { resolveObligationStatus } from "@/lib/compliance/obligations";
import { OBLIGATION_STATUS_LABELS } from "@/lib/compliance/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { FileText, Eye, Loader2, AlertTriangle, Building2 } from "lucide-react";

interface DocumentsPageClientProps {
  companyId: string;
  companyName?: string;
  initialDocuments: Document[];
  profileComplete: boolean;
  demoMode: boolean;
}

export function DocumentsPageClient({
  companyId,
  companyName,
  initialDocuments,
  profileComplete,
  demoMode,
}: DocumentsPageClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [loadingType, setLoadingType] = useState<DocumentType | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  function getLatestDoc(type: DocumentType): Document | undefined {
    return documents.find((d) => d.document_type === type);
  }

  async function handleGenerate(type: DocumentType) {
    if (!profileComplete) {
      setNeedsProfile(true);
      setError("Bitte vervollständigen Sie zuerst das Unternehmensprofil.");
      return;
    }

    setLoadingType(type);
    setError(null);
    setNeedsProfile(false);

    const res = await fetch("/api/generate-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, documentType: type }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Generierung fehlgeschlagen");
      if (data.needsProfile) setNeedsProfile(true);
      setLoadingType(null);
      return;
    }

    setDocuments((prev) => {
      const withoutType = prev.filter((d) => d.document_type !== type);
      return [data.document, ...withoutType];
    });
    setViewDoc(data.document);
    setLoadingType(null);
    router.refresh();
  }

  return (
    <>
      <div className="no-print space-y-6">
      {demoMode && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Demo-Modus aktiv</p>
            <p className="mt-1 text-amber-800">
              Kein OPENAI_API_KEY konfiguriert. Es werden ausführliche Demo-Dokumente auf Basis Ihrer Unternehmensdaten erzeugt.
            </p>
          </div>
        </div>
      )}

      {!profileComplete && (
        <Card className="border-brand-200 bg-brand-50">
          <CardContent className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-brand-600" />
              <div>
                <p className="font-semibold text-slate-900">Unternehmensprofil erforderlich</p>
                <p className="mt-1 text-sm text-slate-600">
                  Für individuelle Dokumente werden Unternehmensname und Branche benötigt.
                </p>
              </div>
            </div>
            <Link href="/company">
              <Button>Zum Unternehmensprofil</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {needsProfile && (
            <Link href="/company" className="ml-2 font-medium underline">
              Profil ausfüllen
            </Link>
          )}
          {error.includes("Datenbank") && (
            <p className="mt-2">
              <a
                href="https://supabase.com/dashboard/project/hmyeguskotcydmodoedr/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                Supabase SQL Editor öffnen
              </a>
              {" · "}
              Datei: <code className="text-xs">supabase/migrations/patch-existing-db.sql</code>
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_TYPES.map((docType) => {
          const existing = getLatestDoc(docType.id);
          const isLoading = loadingType === docType.id;

          return (
            <Card
              key={docType.id}
              interactive
              className={cn(
                "flex flex-col border-t-2",
                existing ? "border-t-emerald-400 hover:shadow-emerald-500/15" : "border-t-slate-200 hover:shadow-brand-500/10"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <div>
                    <CardTitle className="text-sm">{docType.label}</CardTitle>
                    <CardDescription className="mt-1 text-xs">{docType.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleGenerate(docType.id)}
                  disabled={isLoading || !profileComplete}
                >
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {existing ? "Neu generieren" : "Generieren"}
                </Button>
                {existing && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setViewDoc(existing)}>
                      <Eye className="h-3 w-3" /> Anzeigen
                    </Button>
                    <div className="w-full space-y-1 text-xs text-slate-400">
                      <p>Version {existing.version ?? 1}</p>
                      <p>Aktualisiert: {formatDate(existing.updated_at)}</p>
                      {existing.is_mandatory && (
                        <p className="font-medium text-indigo-600">Pflichtdokument</p>
                      )}
                      {existing.deadline && (
                        <p>
                          Frist: {formatDate(existing.deadline)} ·{" "}
                          {OBLIGATION_STATUS_LABELS[
                            resolveObligationStatus({
                              status: "completed",
                              deadline: existing.deadline,
                              criticality: existing.criticality,
                              isMandatory: existing.is_mandatory,
                            })
                          ]}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {documents.length === 0 && !viewDoc && profileComplete && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Noch keine Dokumente erstellt. Wählen Sie einen Dokumenttyp und klicken Sie auf „Generieren“.
          </CardContent>
        </Card>
      )}
      </div>

      {viewDoc && (
        <DocumentViewer
          document={viewDoc}
          companyName={companyName}
          onClose={() => setViewDoc(null)}
          onRegenerate={handleGenerate}
          regenerating={loadingType === viewDoc.document_type}
        />
      )}
    </>
  );
}
