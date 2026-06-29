"use client";

import {
  AD_CREATIVES,
  GOOGLE_CAMPAIGNS,
  GOOGLE_SEARCH_DESCRIPTIONS,
  GOOGLE_SEARCH_HEADLINES,
  LINKEDIN_CAMPAIGNS,
  PAID_AD_FUNNEL,
  RETARGETING_AUDIENCES,
  RETARGETING_MESSAGES,
} from "@/lib/acquisition/ads";
import { Badge } from "@/components/ui/Badge";

export function PaidAdsPlaybook() {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Google Ads — Search (High Intent)</h3>
        <p className="mt-1 text-xs text-slate-500">Landing: /check · CTA: Jetzt prüfen</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Headlines (10)</p>
            <ul className="mt-2 space-y-1 text-sm">
              {GOOGLE_SEARCH_HEADLINES.map((h) => (
                <li key={h} className="rounded bg-slate-50 px-2 py-1">{h}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Descriptions (4)</p>
            <ul className="mt-2 space-y-2 text-sm">
              {GOOGLE_SEARCH_DESCRIPTIONS.map((d) => (
                <li key={d} className="rounded bg-slate-50 px-2 py-1">{d}</li>
              ))}
            </ul>
          </div>
        </div>
        {GOOGLE_CAMPAIGNS.filter((c) => c.type === "search_intent").map((c) => (
          <p key={c.id} className="mt-3 break-all text-xs text-brand-700">{c.adCopy.finalUrl}</p>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Google Display — Retargeting</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {RETARGETING_MESSAGES.google.checkCompleted.map((m) => (
            <li key={m} className="rounded border border-amber-100 bg-amber-50 px-3 py-2">{m}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">LinkedIn Ads — 3 Kampagnen</h3>
        <div className="mt-4 space-y-4">
          {LINKEDIN_CAMPAIGNS.map((camp) => (
            <div key={camp.id} className="rounded-lg border border-slate-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{camp.name}</span>
                <Badge className="bg-sky-100 text-sky-800">{camp.type}</Badge>
              </div>
              {camp.variants.map((v) => (
                <div key={v.id} className="mt-3 border-t border-slate-100 pt-3 text-sm">
                  <p className="font-medium text-slate-900">{v.hook}</p>
                  <p className="mt-1 whitespace-pre-line text-slate-600">{v.introText}</p>
                  <p className="mt-2 text-xs text-brand-700">CTA: {v.cta} → {v.destinationUrl}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Retargeting — Audience Mapping</h3>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="pb-2">Audience</th>
              <th className="pb-2">Message</th>
              <th className="pb-2">CTA</th>
            </tr>
          </thead>
          <tbody>
            {RETARGETING_AUDIENCES.map((a) => (
              <tr key={a.id} className="border-b border-slate-50">
                <td className="py-2 pr-4 font-medium">{a.name}</td>
                <td className="py-2 pr-4">{a.message}</td>
                <td className="py-2">{a.cta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Funnel Mapping</h3>
        <ol className="mt-4 space-y-2">
          {PAID_AD_FUNNEL.map((s) => (
            <li key={s.step} className="flex gap-3 text-sm">
              <span className="font-mono text-brand-600">{s.step}</span>
              <span>{s.name} ({s.path}) → {s.conversionGoal}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Creative Variants</h3>
        <ul className="mt-4 space-y-3">
          {AD_CREATIVES.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-100 p-3 text-sm">
              <span className="font-medium">{c.headline}</span>
              <span className="text-slate-500"> — {c.visualConcept}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
