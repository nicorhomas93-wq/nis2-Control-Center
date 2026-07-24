"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Company, Document, DocumentType, Measure, Nis2Status, Risk } from "@/lib/types";
import {
  AUDIT_FOLDERS,
  AUDIT_STATUS_BADGE_CLASS,
  AUDIT_STATUS_LABELS,
  calculateAuditFolderScore,
  getAuditFolderStatuses,
  getMissingAuditDocumentTypes,
} from "@/lib/audit/audit-folders";
import { downloadAuditPackage } from "@/lib/audit/audit-package";
import { downloadAuditAreaPdf, downloadAuditSummaryPdf } from "@/lib/audit/audit-pdf";
import {
  buildAuditSummaryReportData,
  type AuditSummaryReportData,
} from "@/lib/audit/audit-summary";
import { generateAuditSummaryPdfFileName } from "@/lib/fileNaming";
import { useBranding } from "@/components/layout/BrandingProvider";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import {
  AlertTriangle,
  Building2,
  Download,
  Eye,
  FileDown,
  FileText,
  FolderArchive,
  Loader2,
  Plus,
} from "lucide-react";

interface AuditPageClientProps {
  companyId: string;
  companyName?: string;
  securityContactName?: string | null;
  securityScore?: number;
  nis2Status: Nis2Status;
  complianceScore: number;
  vendorsApplicability?: import("@/lib/vendors/types").VendorApplicability | null;
  profileComplete: boolean;
  initialDocuments: Document[];
  initialMeasures: Measure[];
  initialRisks: Risk[];
}

const REPORT_PREP_MESSAGE = "Audit-Report wird erstellt…";
const REPORT_SUCCESS_MESSAGE = "Audit-Report wurde erfolgreich als PDF erstellt.";
const REPORT_ERROR_PREFIX = "Audit-Report konnte nicht erstellt werden:";
const ZIP_PREP_MESSAGE = "Audit-Paket wird vorbereitet…";
const ZIP_SUCCESS_MESSAGE = "Audit-Paket erfolgreich erstellt.";
const ZIP_ERROR_MESSAGE = "Audit-Paket konnte nicht erstellt werden.";

export function AuditPageClient({
  companyId,
  companyName,
  securityContactName,
  securityScore = 0,
  nis2Status,
  complianceScore,
  vendorsApplicability,
  profileComplete,
  initialDocuments,
  initialMeasures,
  initialRisks,
}: AuditPageClientProps) {
  const router = useRouter();
  const branding = useBranding();
  const foldersRef = useRef<HTMLDivElement>(null);
  const [documents, setDocuments] = useState(initialDocuments);
  const [measures] = useState(initialMeasures);
  const [risks] = useState(initialRisks);
  const [reportData, setReportData] = useState<AuditSummaryReportData | null>(null);
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<DocumentType | null>(null);
  const [pdfLoadingType, setPdfLoadingType] = useState<DocumentType | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);

  const companyCtx = useMemo(
    () =>
      ({
        id: companyId,
        nis2_status: nis2Status,
        compliance_score: complianceScore,
        company_name: companyName ?? null,
        security_contact_name: securityContactName ?? null,
        security_score: securityScore,
        vendors_applicability: vendorsApplicability ?? "unknown",
      }) as Company,
    [
      companyId,
      nis2Status,
      complianceScore,
      companyName,
      securityContactName,
      securityScore,
      vendorsApplicability,
    ]
  );

  const auditScore = useMemo(
    () => calculateAuditFolderScore(documents, companyCtx),
    [documents, companyCtx]
  );
  const folderStatuses = useMemo(
    () => getAuditFolderStatuses(documents, companyCtx),
    [documents, companyCtx]
  );
  const missingTypes = useMemo(
    () => getMissingAuditDocumentTypes(documents, companyCtx),
    [documents, companyCtx]
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
    const missing = getMissingAuditDocumentTypes(documents, companyCtx);
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

  function getReportForExport(): AuditSummaryReportData {
    if (reportData) return reportData;
    return buildAuditSummaryReportData({
      company: companyCtx,
      documents,
      measures,
      risks,
      securityScore,
    });
  }

  async function handleCreateSummary() {
    setSummaryLoading(true);
    setError(null);
    setExportSuccess(null);
    setZipProgress(REPORT_PREP_MESSAGE);

    try {
      const res = await fetch("/api/generate-audit-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Unbekannter Fehler");
      }

      const nextReport =
        (data.report_data as AuditSummaryReportData | undefined) ??
        buildAuditSummaryReportData({
          company: companyCtx,
          documents,
          measures,
          risks,
          aiNarrative: data.export?.summary,
          securityScore: data.export?.security_score ?? securityScore,
          auditReadinessPercent: data.export?.audit_readiness?.percent,
          dataQualityPercent: data.export?.report_data?.dataQualityPercent ?? 0,
          nextSteps: data.export?.next_steps,
        });

      setReportData(nextReport);
      const filename = await downloadAuditSummaryPdf(nextReport, branding);
      setReportFileName(filename);
      setExportSuccess(REPORT_SUCCESS_MESSAGE);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(`${REPORT_ERROR_PREFIX} ${message}`);
    } finally {
      setSummaryLoading(false);
      setZipProgress(null);
    }
  }

  async function handleDownloadZip() {
    setZipLoading(true);
    setError(null);
    setExportSuccess(null);
    setZipProgress(ZIP_PREP_MESSAGE);

    try {
      const report = getReportForExport();
      await downloadAuditPackage({
        documents,
        companyName,
        company: companyCtx,
        reportData: report,
        risks,
        measures,
        folderStatuses,
        branding,
        onProgress: setZipProgress,
      });
      setExportSuccess(ZIP_SUCCESS_MESSAGE);
      setZipProgress(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : ZIP_ERROR_MESSAGE;
      setError(message);
      setZipProgress(null);
    } finally {
      setZipLoading(false);
    }
  }

  function scrollToFolders() {
    foldersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handlePdfDownload(item: (typeof folderStatuses)[number]) {
    setPdfLoadingType(item.documentType);
    setError(null);
    setExportSuccess(null);
    setZipProgress(REPORT_PREP_MESSAGE);

    try {
      await downloadAuditAreaPdf(item.document, item.documentType, companyName, {
        company: companyCtx,
        risks,
        measures,
        quality: item.quality,
      });
      setExportSuccess("PDF erfolgreich heruntergeladen.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "PDF-Export fehlgeschlagen";
      setError(message);
    } finally {
      setPdfLoadingType(null);
      setZipProgress(null);
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
              Inhaltlich bewertet: {auditScore.complete} vollständig · {auditScore.incomplete}{" "}
              unvollständig · {auditScore.missing} fehlend (von {auditScore.total} Bereichen)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProgressRing
              value={auditScore.percent}
              size={88}
              strokeWidth={8}
              colorClassName={auditScore.percent >= 100 ? "text-emerald-600" : "text-brand-600"}
            />
            <div>
              <p className="text-2xl font-bold text-slate-900">{auditScore.percent} %</p>
              {auditScore.percent < 100 && (
                <p className="mt-2 text-sm text-amber-800">
                  Es bestehen noch offene Punkte, die vor einer Prüfung bearbeitet werden sollten.
                </p>
              )}
              {auditScore.percent >= 100 && (
                <p className="mt-2 text-sm text-emerald-800">
                  Der aktuelle Stand spricht für eine gute interne Vorbereitung. Eine externe Prüfung
                  oder Rechtsberatung wird dadurch nicht ersetzt.
                </p>
              )}
            </div>
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

        <div ref={foldersRef}>
        <Card>
          <CardHeader>
            <CardTitle>Dokumentstatus</CardTitle>
            <CardDescription>10 Audit-Bereiche mit inhaltlicher Bewertung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {folderStatuses.map((item) => (
              <div
                key={item.folderName}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between",
                  (item.displayStatus === "missing" || item.displayStatus === "outdated") &&
                    "border-l-4 border-l-red-500 bg-red-50/40",
                  (item.displayStatus === "review_due" || item.displayStatus === "evidence_missing") &&
                    "border-l-4 border-l-amber-500"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-brand-600">
                      {item.folderName}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${AUDIT_STATUS_BADGE_CLASS[item.displayStatus]}`}
                    >
                      {AUDIT_STATUS_LABELS[item.displayStatus]}
                    </span>
                    <span className="text-xs text-slate-500">{item.quality.scorePercent} %</span>
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{item.label}</p>
                  {item.document && (
                    <p className="mt-1 text-xs text-slate-500">
                      Version v{item.document.version ?? 1} · Zuletzt aktualisiert:{" "}
                      {formatDate(item.document.updated_at)}
                    </p>
                  )}
                  {item.quality.issues.length > 0 && (
                    <p className="mt-1 text-xs text-amber-700">{item.quality.issues.join(" · ")}</p>
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
                        onClick={() => handlePdfDownload(item)}
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
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pdfLoadingType === item.documentType}
                        onClick={() => handlePdfDownload(item)}
                      >
                        {pdfLoadingType === item.documentType ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <FileDown className="h-3 w-3" />
                        )}
                        PDF herunterladen
                      </Button>
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
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Export & Audit-Report</CardTitle>
            <CardDescription>
              Professionellen Audit-Report als PDF erstellen oder vollständiges Audit-Paket herunterladen
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
              <Button onClick={handleCreateSummary} disabled={summaryLoading || zipLoading}>
                {summaryLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {REPORT_PREP_MESSAGE}
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" /> Audit-Report als PDF erstellen
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleDownloadZip} disabled={zipLoading || summaryLoading}>
                {zipLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {zipProgress ?? ZIP_PREP_MESSAGE}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Audit-Paket herunterladen
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={scrollToFolders}>
                <FolderArchive className="h-4 w-4" /> Audit-Ordner öffnen
              </Button>
            </div>

            {batchProgress && batchLoading && (
              <p className="text-sm text-slate-600">{batchProgress}</p>
            )}
            {(zipProgress || exportSuccess) && (
              <p
                className={`text-sm ${exportSuccess ? "text-emerald-700" : "text-slate-600"}`}
              >
                {exportSuccess ?? zipProgress}
              </p>
            )}

            {reportFileName && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-medium">Letzter Audit-Report</p>
                <p className="mt-1">{reportFileName}</p>
              </div>
            )}

            <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
              <p className="font-medium text-slate-700">ZIP-Struktur</p>
              <ul className="mt-2 space-y-1 font-mono">
                {AUDIT_FOLDERS.map((f) => (
                  <li key={f.folderName}>{f.folderName}/</li>
                ))}
                <li>README_Audit_Ordner.txt</li>
                <li>{generateAuditSummaryPdfFileName({ companyName, date: new Date() })}</li>
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
