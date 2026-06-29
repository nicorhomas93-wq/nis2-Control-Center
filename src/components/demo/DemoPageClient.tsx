"use client";

import { useState } from "react";
import Link from "next/link";
import {
  calculateAuditFolderScore,
  getAuditFolderStatuses,
} from "@/lib/audit/audit-folders";
import { downloadAuditPackage } from "@/lib/audit/audit-package";
import { buildStructuredAuditSummary } from "@/lib/audit/audit-summary";
import {
  DEMO_ASSESSMENT,
  DEMO_COMPANY,
  DEMO_DOCUMENTS,
  DEMO_LAST_AUDIT_EXPORT,
  DEMO_MEASURES,
  DEMO_RISKS,
} from "@/lib/demo/demo-data";
import { getNis2StatusLabel } from "@/lib/nis2/betroffenheit";
import { formatDate, formatCurrency } from "@/lib/utils";
import { DemoShell } from "@/components/demo/DemoShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Building2,
  CheckCircle2,
  Download,
  FileText,
  FolderArchive,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "company", label: "Unternehmen", icon: Building2 },
  { id: "assessment", label: "Betroffenheit", icon: ShieldCheck },
  { id: "documents", label: "Dokumente", icon: FileText },
  { id: "audit", label: "Audit-Ordner", icon: FolderArchive },
] as const;

type DemoTab = (typeof tabs)[number]["id"];

export function DemoPageClient() {
  const [activeTab, setActiveTab] = useState<DemoTab>("dashboard");
  const [zipLoading, setZipLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState<string | null>(null);

  const auditScore = calculateAuditFolderScore(DEMO_DOCUMENTS);
  const folderStatuses = getAuditFolderStatuses(DEMO_DOCUMENTS);
  const openMeasures = DEMO_MEASURES.filter((m) => m.status !== "completed").length;

  async function handleDemoZip() {
    setZipLoading(true);
    setZipProgress("Demo-Audit-Paket wird erstellt…");
    try {
      const summary = buildStructuredAuditSummary({
        company: DEMO_COMPANY,
        documents: DEMO_DOCUMENTS,
        measures: DEMO_MEASURES,
        risks: DEMO_RISKS,
      });
      await downloadAuditPackage({
        documents: DEMO_DOCUMENTS,
        companyName: DEMO_COMPANY.company_name ?? undefined,
        summaryText: summary,
        onProgress: setZipProgress,
      });
      setZipProgress("Demo-ZIP heruntergeladen.");
    } catch {
      setZipProgress("ZIP-Export fehlgeschlagen.");
    } finally {
      setZipLoading(false);
    }
  }

  return (
    <DemoShell>
      <div className="mb-6 flex gap-4 flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produkt-Demo</h1>
          <p className="mt-1 text-slate-500">
            Erkunden Sie das TKND NIS2 Control Center mit Beispieldaten.
          </p>
        </div>
        <Link href="/register">
          <Button>Kostenlosen Check starten</Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Audit-Score</p>
                <p className="mt-1 text-3xl font-bold text-emerald-600">{auditScore.percent}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Dokumente</p>
                <p className="mt-1 text-3xl font-bold">{DEMO_DOCUMENTS.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Offene Maßnahmen</p>
                <p className="mt-1 text-3xl font-bold">{openMeasures}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Risiken erfasst</p>
                <p className="mt-1 text-3xl font-bold">{DEMO_RISKS.length}</p>
              </CardContent>
            </Card>
          </div>
          {auditScore.percent === 100 && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Audit-Ordner vollständig vorbereitet (Demo).
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Letzter Audit-Export</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              {formatDate(DEMO_LAST_AUDIT_EXPORT)} · Demo-Export verfügbar
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "company" && (
        <Card>
          <CardHeader>
            <CardTitle>Unternehmensprofil (Demo)</CardTitle>
            <CardDescription>MusterTech GmbH – Beispieldaten</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm grid-cols-2">
            <p><span className="font-medium">Name:</span> {DEMO_COMPANY.company_name}</p>
            <p><span className="font-medium">Branche:</span> {DEMO_COMPANY.industry}</p>
            <p><span className="font-medium">Mitarbeiter:</span> {DEMO_COMPANY.employee_count}</p>
            <p><span className="font-medium">Umsatz:</span> {formatCurrency(DEMO_COMPANY.annual_revenue)}</p>
            <p><span className="font-medium">Bilanzsumme:</span> {formatCurrency(DEMO_COMPANY.balance_sheet_total)}</p>
            <p><span className="font-medium">Land:</span> {DEMO_COMPANY.country}</p>
            <p><span className="font-medium">EU-weit tätig:</span> Ja</p>
            <p><span className="font-medium">Microsoft 365:</span> Ja</p>
            <p><span className="font-medium">Cloud-Dienste:</span> Ja</p>
            <p><span className="font-medium">ISB:</span> {DEMO_COMPANY.security_contact_name}</p>
            <p className="col-span-2">
              <span className="font-medium">Kritische Prozesse:</span>{" "}
              {DEMO_COMPANY.critical_business_processes}
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === "assessment" && (
        <Card>
          <CardHeader>
            <CardTitle>Betroffenheitscheck (Demo)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge className="bg-amber-100 text-amber-800">
              {getNis2StatusLabel(DEMO_ASSESSMENT.result)}
            </Badge>
            <p className="text-sm text-slate-600">{DEMO_ASSESSMENT.reasoning}</p>
            <p className="text-xs text-slate-400">
              Score: {DEMO_ASSESSMENT.score} · {formatDate(DEMO_ASSESSMENT.created_at)}
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === "documents" && (
        <Card>
          <CardHeader>
            <CardTitle>Dokumente (Demo)</CardTitle>
            <CardDescription>{DEMO_DOCUMENTS.length} NIS2-Dokumente vorhanden</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {DEMO_DOCUMENTS.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{doc.title}</p>
                    <p className="text-slate-500">Version v{doc.version} · Demo-Modus</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {activeTab === "audit" && (
        <div className="space-y-6">
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-6">
              <p className="text-lg font-bold text-emerald-800">
                Audit-Ordner zu {auditScore.percent} % vollständig
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                Alle 10 Dokumentbereiche sind in der Demo befüllt.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit-Bereiche</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {folderStatuses.map((item) => (
                <div
                  key={item.folderName}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-brand-600">{item.folderName}</span>
                  <span className="text-slate-700">{item.label}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button onClick={handleDemoZip} disabled={zipLoading} className="w-auto">
            {zipLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {zipProgress}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Demo Audit-Paket herunterladen
              </>
            )}
          </Button>
          {zipProgress && !zipLoading && (
            <p className="text-sm text-emerald-700">{zipProgress}</p>
          )}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        <Link href="/legal" className="hover:text-brand-600">
          Rechtliche Hinweise
        </Link>
        {" · "}Demo-Daten werden nicht gespeichert.
      </p>
    </DemoShell>
  );
}
