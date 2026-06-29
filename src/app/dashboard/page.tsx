import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardActions } from "@/components/dashboard/DashboardActions";
import { NextStepsCard } from "@/components/dashboard/NextStepsCard";
import { ComplianceWarningsBanner } from "@/components/dashboard/ComplianceWarningsBanner";
import { SecurityStatusCardClient } from "@/components/dashboard/SecurityStatusCardClient";
import { SupabaseSetupBanner } from "@/components/ui/SupabaseSetupBanner";
import { BillingStatusBanner } from "@/components/billing/BillingStatusBanner";
import { ActiveMandantBanner } from "@/components/consultant/ActiveMandantBanner";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceCompany, isCompanyProfileComplete, getOrCreateProfile } from "@/lib/company";
import { isPlatformOwner } from "@/lib/jarvis/access";
import { calculateAuditFolderScore } from "@/lib/audit/audit-folders";
import { calculateComplianceScore } from "@/lib/nis2/compliance-score";
import { buildNextSteps, calculateSecurityStatus } from "@/lib/compliance";
import { buildComplianceWarnings } from "@/lib/compliance/warnings";
import { loadSecurityScoreHistory, syncCompanySecurityScore } from "@/lib/compliance/sync";
import { getNis2StatusColor, getNis2StatusLabel } from "@/lib/nis2/betroffenheit";
import { formatDate } from "@/lib/utils";
import type { ActivityItem, Document, Incident, Measure, Nis2Assessment, Risk } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FunnelWelcomeBanner } from "@/components/funnel/FunnelWelcomeBanner";
import { redirect } from "next/navigation";

function buildRecentActivity(
  assessments: Nis2Assessment[],
  documents: Document[],
  measures: Measure[],
  complianceEvents: { id: string; title: string; details: string | null; created_at: string }[] = []
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...complianceEvents.map((e) => ({
      id: `e-${e.id}`,
      action: e.title,
      details: e.details,
      created_at: e.created_at,
    })),
    ...assessments.map((a) => ({
      id: `a-${a.id}`,
      action: "Betroffenheitscheck durchgeführt",
      details: getNis2StatusLabel(a.result),
      created_at: a.created_at,
    })),
    ...documents.map((d) => ({
      id: `d-${d.id}`,
      action: "Dokument erstellt",
      details: d.title,
      created_at: d.created_at,
    })),
    ...measures.map((m) => ({
      id: `m-${m.id}`,
      action: "Maßnahme erfasst",
      details: m.title,
      created_at: m.created_at,
    })),
  ];
  return items
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ funnel?: string }>;
}) {
  const params = await searchParams;
  const showFunnelWelcome = params.funnel === "1";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { company, ownCompany, missingTable, isViewingMandant } = await getWorkspaceCompany(user.id);
  const profile = await getOrCreateProfile(user.id, user.email);
  const platformOwner = isPlatformOwner(user.email, profile?.role);

  let docs: Document[] = [];
  let meas: Measure[] = [];
  let risks: Risk[] = [];
  let incidents: Incident[] = [];
  let assessments: Nis2Assessment[] = [];
  let lastAuditExport: string | null = null;
  let securityHistory: Awaited<ReturnType<typeof loadSecurityScoreHistory>> = [];
  let complianceEvents: { id: string; title: string; details: string | null; created_at: string }[] = [];

  if (company) {
    const [docRes, measRes, risksRes, incidentsRes, assessRes, auditRes, eventsRes] = await Promise.all([
      supabase.from("documents").select("*").eq("company_id", company.id).order("created_at", { ascending: false }),
      supabase.from("measures").select("*").eq("company_id", company.id),
      supabase.from("risks").select("*").eq("company_id", company.id),
      supabase.from("incidents").select("*").eq("company_id", company.id),
      supabase.from("nis2_assessments").select("*").eq("company_id", company.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("audit_exports").select("created_at").eq("company_id", company.id).order("created_at", { ascending: false }).limit(1),
      supabase
        .from("compliance_events")
        .select("id, title, details, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    docs = (docRes.data ?? []) as Document[];
    meas = (measRes.data ?? []) as Measure[];
    risks = (risksRes.data ?? []) as Risk[];
    incidents = (incidentsRes.data ?? []) as Incident[];
    assessments = (assessRes.data ?? []) as Nis2Assessment[];
    lastAuditExport = auditRes.data?.[0]?.created_at ?? null;
    complianceEvents = (eventsRes.data ?? []) as typeof complianceEvents;

    await syncCompanySecurityScore(supabase, company.id);
    securityHistory = await loadSecurityScoreHistory(supabase, company.id);
  }

  const securityStatus = calculateSecurityStatus({
    company,
    documents: docs,
    measures: meas,
    risks,
    incidents,
  });
  const nextSteps = buildNextSteps({
    documents: docs,
    measures: meas,
    risks,
    incidents,
  });
  const complianceWarnings = buildComplianceWarnings({
    documents: docs,
    measures: meas,
    risks,
    incidents,
  });

  const profileComplete = isCompanyProfileComplete(company);
  const openMeasures = meas.filter((m) => m.status !== "completed").length;
  const score = calculateComplianceScore(company, docs, meas);
  const auditScore = calculateAuditFolderScore(docs);
  const activities = buildRecentActivity(assessments, docs, meas, complianceEvents);
  const missingCount = auditScore.total - auditScore.present;

  return (
    <DashboardShell>
      {missingTable && <SupabaseSetupBanner />}
      {isViewingMandant && <ActiveMandantBanner companyName={company?.company_name ?? null} />}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">
          Willkommen im TKND NIS2 Control Center
          {company?.company_name ? ` – ${company.company_name}` : ""}
        </p>
      </div>

      <BillingStatusBanner company={ownCompany} platformOwner={platformOwner} />

      {company && (
        <SecurityStatusCardClient
          companyId={company.id}
          score={securityStatus.score}
          level={securityStatus.level}
          summary={securityStatus.summary}
          drivers={securityStatus.drivers}
          auditReadiness={securityStatus.auditReadiness}
          history={securityHistory}
        />
      )}

      {company && <ComplianceWarningsBanner warnings={complianceWarnings} />}

      {company && <NextStepsCard steps={nextSteps} />}

      {showFunnelWelcome && company && (
        <FunnelWelcomeBanner
          complianceScore={score}
          openMeasures={openMeasures}
          documentCount={docs.length}
          auditPercent={auditScore.percent}
        />
      )}

      {!profileComplete && !missingTable && (
        <Card className="mb-8 border-brand-200 bg-brand-50">
          <CardContent className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-brand-600" />
              <div>
                <p className="font-semibold text-slate-900">Unternehmensprofil ausfüllen</p>
                <p className="mt-1 text-sm text-slate-600">
                  Erfassen Sie Ihre Unternehmensdaten, um Betroffenheitscheck und Dokumente zu nutzen.
                </p>
              </div>
            </div>
            <Link href="/company">
              <Button>
                Profil ausfüllen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {company && (
        <DashboardActions
          companyId={company.id}
          companyName={company.company_name ?? undefined}
          documents={docs}
          missingCount={missingCount}
          auditScorePercent={auditScore.percent}
        />
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Audit-Score</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{auditScore.percent}%</p>
            <p className="mt-1 text-xs text-slate-400">
              {auditScore.present}/{auditScore.total} Bereiche
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Dokumente erstellt</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{docs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Offene Maßnahmen</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{openMeasures}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Risiken erfasst</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{risks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Letzter Audit-Export</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {lastAuditExport ? formatDate(lastAuditExport) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">NIS2-Status</p>
            <Badge className={`mt-2 ${getNis2StatusColor(company?.nis2_status ?? "unbekannt")}`}>
              {getNis2StatusLabel(company?.nis2_status ?? "unbekannt")}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Compliance-Score</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{score}%</p>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${score}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Aktivität</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-slate-500">
              Noch keine Aktivitäten. Starten Sie mit dem Unternehmensprofil oder dem Betroffenheitscheck.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activities.map((act) => (
                <li key={act.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{act.action}</p>
                    {act.details && <p className="text-slate-500">{act.details}</p>}
                  </div>
                  <span className="shrink-0 text-slate-400">{formatDate(act.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
