"use client";

import {
  CONTENT_CALENDAR,
  CONVERSION_FUNNEL,
  ICP_SEGMENTS,
  LINKEDIN_OUTREACH_WORKFLOW,
  TRAFFIC_FLOW,
} from "@/lib/acquisition";
import { PaidAdsPlaybook } from "@/components/jarvis/acquisition/PaidAdsPlaybook";
import { Badge } from "@/components/ui/Badge";
import { Target, Users, Mail, RefreshCw, TrendingUp, Zap } from "lucide-react";

type Overview = Awaited<ReturnType<typeof import("@/lib/acquisition/overview").getAcquisitionOverview>>;

export function AcquisitionDashboard({ overview }: { overview: Overview }) {
  const stats = [
    { label: "Besucher", value: overview.visitors, icon: Users },
    { label: "Checks abgeschlossen", value: overview.checksCompleted, icon: Target },
    { label: "Leads", value: overview.leads, icon: TrendingUp },
    { label: "Nurturing", value: overview.nurturing, icon: Mail },
    { label: "Retargeting", value: overview.retargetingEligible, icon: RefreshCw },
    { label: "Ø Score", value: overview.avgScore, icon: Zap },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Acquisition System</h2>
        <p className="text-sm text-slate-500">
          NIS2-Check Leads → Nurturing → Paid · E-Mails pending: {overview.emailsPending} ·
          gesendet: {overview.emailsSent}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Icon className="h-4 w-4" />
              {label}
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <PaidAdsPlaybook />

      <div className="grid gap-6 grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">ICP — Zielsegmente</h3>
          <ul className="mt-4 space-y-3">
            {ICP_SEGMENTS.map((s) => (
              <li key={s.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.name}</span>
                  <Badge className={s.priority === "high" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}>
                    {s.employeeMin}–{s.employeeMax} MA
                  </Badge>
                </div>
                <p className="mt-1 text-slate-500">{s.painPoints[0]}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Traffic Flow</h3>
          <ol className="mt-4 space-y-2">
            {TRAFFIC_FLOW.map((stage) => (
              <li key={stage.id} className="flex gap-3 text-sm">
                <span className="font-mono text-brand-600">{stage.id}</span>
                <span>{stage.name} — {stage.goal}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">LinkedIn Outreach</h3>
          <ol className="mt-4 space-y-2">
            {LINKEDIN_OUTREACH_WORKFLOW.map((step, i) => (
              <li key={step.step} className="text-sm">
                <span className="font-medium">{i + 1}. {step.title}</span>
                <span className="text-slate-500"> — {step.action}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Conversion Funnel</h3>
          <ol className="mt-4 space-y-2">
            {CONVERSION_FUNNEL.map((stage) => (
              <li key={stage.id} className="text-sm">
                <span className="font-mono text-slate-600">{stage.path}</span>
                <span className="text-slate-800"> → {stage.cta}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Letzte Leads</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 pr-4">E-Mail</th>
                <th className="pb-2 pr-4">Score</th>
                <th className="pb-2 pr-4">Funnel</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-50">
                  <td className="py-2 pr-4">{lead.email ?? "—"}</td>
                  <td className="py-2 pr-4">{lead.acquisition_score}</td>
                  <td className="py-2 pr-4">{lead.funnel_score ?? "—"}</td>
                  <td className="py-2">{lead.status}</td>
                </tr>
              ))}
              {overview.recentLeads.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-slate-400">
                    Noch keine Acquisition-Leads
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Content Engine — Kalender</h3>
        <ul className="mt-4 space-y-2">
          {CONTENT_CALENDAR.slice(0, 5).map((c) => (
            <li key={c.id} className="text-sm">
              <Badge className="mr-2 bg-slate-100 text-slate-600">{c.format}</Badge>
              {c.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
