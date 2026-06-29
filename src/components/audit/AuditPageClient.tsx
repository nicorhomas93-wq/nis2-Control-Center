"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Company, Document, DocumentType, Measure, Nis2Status, Risk } from "@/lib/types";
import {
  AUDIT_FOLDERS,
  calculateAuditFolderScore,
  getAuditFolderStatuses,
  getMissingAuditDocumentTypes,
} from "@/lib/audit/audit-folders";
import { downloadAuditPackage } from "@/lib/audit/audit-package";
import { buildStructuredAuditSummary } from "@/lib/audit/audit-summary";
import { downloadDocumentPdf } from "@/lib/documents/pdf-export";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileDown,
  FileText,
  FolderArchive,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";

interface AuditPageClientProps {
  companyId: string;
  companyName?: string;
  nis2Status: Nis2Status;
  complianceScore: number;
  profileComplete: boolean;
  initialDocuments: Document[];
  initialMeasures: Measure[];
  initialRisks: Risk[];
}

export function AuditPageClient({
  companyId,
  companyName,
  nis2Status,
  complianceScore,
  profileComplete,
  initialDocuments,
  initialMeasures,
  initialRisks,
}: AuditPageClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [measures] = useState(initialMeasures);
  const [risks] = useState(initialRisks);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<DocumentType | null>(null);
  const [pdfLoadingType, setPdfLoadingType] = useState<DocumentType | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);

  const auditScore = useMemo(() => calculateAuditFolderScore(documents), [documents]);
  const folderStatuses = useMemo(() => getAuditFolderStatuses(documents), [documents]);
  const missingTypes = useMemo(() => getMissingAuditDocumentTypes(documents), [documents]);

  const companyStub: Company = useMemo(
    () =>
      ({
        id: companyId,
        nis2_status: nis2Status,
        compliance_score: complianceScore,
        company_name: companyName ?? null,
      }) as Company,
    [companyId, nis2Status, complianceScore, companyName]
  );

  function upsertDocument(doc: Document) {
    setDocuments((prev) => {
      const without = prev.filter((d) => d.document_type !== doc.document_type);
      return [doc, ...without];
    });
  }

  async function generateDocument(type: DocumentType): Promise<Document | null> {
    if (!profileComplete) {
      setError("Bitte zuerst Unternehmensprofil ausfüllen.");
      return null;
    }

    const res = await fetch("/api/generate-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, documentType: type }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Dokumentgenerierung fehlgeschlagen");
      return null;
    }

    upsertDocument(data.document as Document);
    return data.document as Document;
  }

  async function handleGenerateSingle(type: DocumentType) {
    setLoadingType(type);
    setError(null);
    const doc = await generateDocument(type);
    if (doc) setViewDoc(doc);
    setLoadingType(null);
    router.refresh();
  }

  async function handleGenerateMissing() {
    const missing = getMissingAuditDocumentTypes(documents);
    if (missing.length === 0) return;

    setBatchLoading(true);
    setError(null);

    for (let i = 0; i < missing.length; i++) {
      setBatchProgress(`Dokument ${i + 1} von ${missing.length} wird erstellt…`);
      const doc = await generateDocument(missing[i]);
      if (!doc) {
        setBatchLoading(false);
        setBatchProgress(null);
        return;
      }
    }

    setBatchProgress(null);
    setBatchLoading(false);
    router.refresh();
  }

  async function handleCreateSummary() {
    setSummaryLoading(true);
    setError(null);

    const res = await fetch("/api/generate-audit-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Audit-Zusammenfassung fehlgeschlagen");
      setSummaryLoading(false);
      return;
    }

    setSummaryText(data.summary_text ?? data.export?.summary_text ?? null);
    setSummaryLoading(false);
  }

  function getSummaryForExport(): string {
    if (summaryText) return summaryText;
    return buildStructuredAuditSummary({
      company: companyStub,
      documents,
      measures,
      risks,
    });
  }

  async function handleDownloadZip() {
    if (documents.length === 0) {
      setError("Noch keine Dokumente vorhanden. Bitte zuerst Dokumente generieren.");
      return;
    }

    setZipLoading(true);
    setError(null);
    setZipProgress("Audit-Paket wird vorbereitet…");

    try {
      const filename = await downloadAuditPackage({
        documents,
        companyName,
        summaryText: getSummaryForExport(),
        onProgress: setZipProgress,
      });
      setZipProgress(`Heruntergeladen: ${filename}`);
    } catch {
      setError("ZIP-Export fehlgeschlagen. Bitte erneut versuchen.");
      setZipProgress(null);
    } finally {
      setZipLoading(false);
    }
  }

  async function handlePdfDownload(doc: Document, type: DocumentType) {
    setPdfLoadingType(type);
    setError(null);
    try {
      await downloadDocumentPdf(doc, companyName);
    } catch {
      setError("PDF-Download fehlgeschlagen.");
    } finally {
      setPdfLoadingType(null);
    }
  }

  if (!profileComplete) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-medium text-amber-900">Unternehmensprofil unvollständig</p>
              <p className="mt-1 text-sm text-amber-800">
                Bitte zuerst Unternehmensprofil ausfüllen, um den Audit-Ordner zu nutzen.
              </p>
            </div>
          </div>
          <Link href="/company">
            <Button variant="outline">Zum Unternehmensprofil</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderArchive className="h-5 w-5 text-brand-600" />
              Audit-Vorbereitungsstand
            </CardTitle>
            <CardDescription>
              Audit-Ordner zu {auditScore.percent} % vollständig ({auditScore.present} von{" "}
              {auditScore.total} Dokumenten)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${auditScore.percent}%` }}
              />
            </div>
            <p className="text-2xl font-bold text-slate-900">{auditScore.percent} %</p>
          </CardContent>
        </Card>

        {missingTypes.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                {missingTypes.length} fehlende Dokument{missingTypes.length === 1 ? "" : "e"}
              </p>
              <p className="mt-1 text-amber-800">
                Für einen vollständigen Audit-Ordner sollten alle Bereiche dokumentiert sein.
              </p>
            </div>
          </div>
        )}

        {documents.length === 0 && (
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">Noch keine Dokumente vorhanden</p>
                <p className="mt-1 text-sm text-slate-500">
                  Generieren Sie die Basisdokumente für Ihren Audit-Ordner.
                </p>
              </div>
              <Button onClick={handleGenerateMissing} disabled={batchLoading}>
                {batchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Basisdokumente generieren
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Basisdokumente generieren
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dokumentstatus</CardTitle>
            <CardDescription>10 Audit-Bereiche mit Status und Aktionen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {folderStatuses.map((item) => (
              <div
                key={item.folderName}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-brand-600">
                      {item.folderName}
                    </span>
                    {item.present ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> vorhanden
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        <XCircle className="h-3 w-3" /> fehlt
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{item.label}</p>
                  {item.document && (
                    <p className="mt-1 text-xs text-slate-500">
                      Version v{item.document.version ?? 1} · Zuletzt aktualisiert:{" "}
                      {formatDate(item.document.updated_at)}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.document ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewDoc(item.document!)}
                      >
                        <Eye className="h-3 w-3" /> Anzeigen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pdfLoadingType === item.documentType}
                        onClick={() => handlePdfDownload(item.document!, item.documentType)}
                      >
                        {pdfLoadingType === item.documentType ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <FileDown className="h-3 w-3" />
                        )}
                        PDF herunterladen
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingType === item.documentType || batchLoading}
                      onClick={() => handleGenerateSingle(item.documentType)}
                    >
                      {loadingType === item.documentType ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Dokument generieren
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export & Zusammenfassung</CardTitle>
            <CardDescription>
              Audit-Zusammenfassung erstellen und strukturiertes ZIP-Paket herunterladen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {missingTypes.length > 0 && (
                <Button variant="outline" onClick={handleGenerateMissing} disabled={batchLoading}>
                  {batchLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {batchProgress}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Fehlende Dokumente generieren
                    </>
                  )}
                </Button>
              )}
              <Button onClick={handleCreateSummary} disabled={summaryLoading}>
                {summaryLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Wird erstellt…
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" /> Audit-Zusammenfassung erstellen
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadZip}
                disabled={zipLoading || documents.length === 0}
              >
                {zipLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {zipProgress ?? "ZIP wird erstellt…"}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Audit-Paket herunterladen
                  </>
                )}
              </Button>
            </div>

            {batchProgress && batchLoading && (
              <p className="text-sm text-slate-600">{batchProgress}</p>
            )}
            {zipProgress && !zipLoading && (
              <p className="text-sm text-emerald-700">{zipProgress}</p>
            )}

            {summaryText && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-sm font-medium text-slate-700">Audit-Zusammenfassung</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                  {summaryText}
                </pre>
              </div>
            )}

            <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
              <p className="font-medium text-slate-700">ZIP-Struktur</p>
              <ul className="mt-2 space-y-1 font-mono">
                {AUDIT_FOLDERS.map((f) => (
                  <li key={f.folderName}>{f.folderName}/</li>
                ))}
                <li>README_Audit_Ordner.txt</li>
                <li>Audit_Zusammenfassung.txt</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        <p className="text-xs text-slate-400">
          <Link href="/legal" className="hover:text-brand-600">
            Rechtliche Hinweise
          </Link>
        </p>
      </div>

      {viewDoc && (
        <div className="mt-6">
          <DocumentViewer
            document={viewDoc}
            companyName={companyName}
            onClose={() => setViewDoc(null)}
            onRegenerate={async (type) => {
              await handleGenerateSingle(type);
            }}
            regenerating={loadingType === viewDoc.document_type}
          />
        </div>
      )}
    </>
  );
}
