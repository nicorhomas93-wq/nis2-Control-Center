"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Document, DocumentType } from "@/lib/types";
import {
  buildFullMarkdownExport,
  copyToClipboard,
  downloadTextFile,
  generateDocumentFileNameFromDocument,
  printDocument,
} from "@/lib/documents/export";
import { downloadDocumentPdf } from "@/lib/documents/pdf-export";
import {
  DOCUMENT_QUALITY_WARNING,
  prepareDocumentText,
} from "@/lib/documents/text-normalize";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DocumentContent } from "@/components/documents/DocumentContent";
import { DocumentMetadata } from "@/components/documents/DocumentMetadata";
import {
  Copy,
  Download,
  FileText,
  Loader2,
  Printer,
  FileDown,
  RefreshCw,
  X,
} from "lucide-react";

interface DocumentViewerProps {
  document: Document;
  companyName?: string;
  onClose: () => void;
  onRegenerate: (type: DocumentType) => Promise<void>;
  regenerating: boolean;
}

export function DocumentViewer({
  document: doc,
  companyName,
  onClose,
  onRegenerate,
  regenerating,
}: DocumentViewerProps) {
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const prepared = useMemo(
    () => prepareDocumentText(doc.content ?? ""),
    [doc.content]
  );
  const markdown = buildFullMarkdownExport({ ...doc, content: prepared.text });

  async function handlePdfDownload() {
    setPdfLoading(true);
    setPdfError(null);
    try {
      await downloadDocumentPdf(doc, companyName);
    } catch {
      setPdfError("PDF-Export fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(markdown);
    setCopyMsg(ok ? "Markdown kopiert" : "Kopieren fehlgeschlagen");
    setTimeout(() => setCopyMsg(null), 2500);
  }

  return (
    <Card className="print-document border-brand-200 shadow-md">
      <CardHeader className="no-print border-b border-slate-100 bg-slate-50/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-lg">{doc.title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-3 w-3" /> Schließen
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={regenerating}
              onClick={() => onRegenerate(doc.document_type as DocumentType)}
            >
              {regenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Neu generieren
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="h-3 w-3" /> Markdown kopieren
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadTextFile(
                  markdown,
                  generateDocumentFileNameFromDocument(doc, companyName, "md"),
                  "text/markdown"
                )
              }
            >
              <FileText className="h-3 w-3" /> Als .md herunterladen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadTextFile(
                  prepared.text,
                  generateDocumentFileNameFromDocument(doc, companyName, "txt"),
                  "text/plain"
                )
              }
            >
              <Download className="h-3 w-3" /> Als .txt herunterladen
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pdfLoading}
              onClick={handlePdfDownload}
            >
              {pdfLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileDown className="h-3 w-3" />
              )}
              PDF herunterladen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => printDocument(doc, companyName)}
            >
              <Printer className="h-3 w-3" /> Drucken / PDF speichern
            </Button>
          </div>
        </div>
        {copyMsg && <p className="mt-2 text-xs text-emerald-600">{copyMsg}</p>}
        {pdfError && <p className="mt-2 text-xs text-red-600">{pdfError}</p>}
        {!prepared.quality.ok && (
          <p className="mt-2 text-xs text-amber-700">{DOCUMENT_QUALITY_WARNING}</p>
        )}
      </CardHeader>

      <CardContent className="print-document-content pt-6">
        <div className="mb-6">
          <DocumentMetadata document={doc} companyName={companyName} />
        </div>

        <DocumentContent content={prepared.text} />
        <p className="mt-2 text-xs text-slate-400">
          <Link href="/legal" className="hover:text-brand-600">
            Rechtliche Hinweise
          </Link>
          {" · "}KI-generierte Inhalte vor Verwendung prüfen.
        </p>
      </CardContent>
    </Card>
  );
}
