"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  FolderArchive,
  Shield,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PilotRequestModal } from "@/components/marketing/PilotRequestModal";
import { Button } from "@/components/ui/Button";

const problemItems = [
  "Unternehmen wissen oft nicht, ob sie betroffen sind.",
  "Dokumente fehlen.",
  "Risiken, Maßnahmen und Nachweise liegen verteilt.",
  "Audit- und Prüfvorbereitung ist aufwendig.",
];

const solutionSteps = [
  "Unternehmensprofil",
  "Betroffenheitscheck",
  "Dokumentengenerierung",
  "Maßnahmen",
  "Risiken",
  "Incident-Prozess",
  "Audit-Ordner",
];

const features = [
  { icon: ShieldCheck, title: "NIS2-Betroffenheitscheck", description: "Automatische Einordnung auf Basis Ihrer Unternehmensdaten." },
  { icon: FileCheck, title: "KI-Dokumentengenerator", description: "Leitlinien, Risikoanalysen und Incident-Response-Pläne in Minuten." },
  { icon: ClipboardList, title: "PDF-Export mit Versionierung", description: "Auditfähige PDFs mit konsistenter Dateinamenlogik." },
  { icon: Shield, title: "Risikoanalyse", description: "Systematische Erfassung und Bewertung von IT-Risiken." },
  { icon: Zap, title: "Maßnahmenplan", description: "Offene, laufende und umgesetzte Maßnahmen zentral verfolgen." },
  { icon: AlertTriangle, title: "Incident-Response-Dokumentation", description: "Strukturierte Vorbereitung auf Sicherheitsvorfälle." },
  { icon: FolderArchive, title: "Audit-Score", description: "Fortschritt des Audit-Ordners auf einen Blick." },
  { icon: FolderArchive, title: "ZIP-Audit-Paket mit 10 Dokumentbereichen", description: "Vollständiger Export für Prüfungen und Audits." },
];

const audiences = [
  "IT-Systemhäuser",
  "MSPs",
  "Datenschutz- und Compliance-Berater",
  "mittelständische Unternehmen",
  "ICT-Dienstleister",
  "Unternehmen mit Microsoft 365 Nutzung",
];

const pilotIncludes = [
  "Einrichtung Unternehmensprofil",
  "initiale Betroffenheitsanalyse",
  "10 NIS2-Dokumentbereiche",
  "Audit-Ordner-Export",
  "60 Minuten Onboarding",
  "Feedbackrunde",
];

export function LandingPageClient() {
  const [pilotOpen, setPilotOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader onPilotRequest={() => setPilotOpen(true)} />
      <PilotRequestModal open={pilotOpen} onClose={() => setPilotOpen(false)} />

      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            <Shield className="h-4 w-4" />
            NIS2-Compliance für den deutschen Mittelstand
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            NIS2-Dokumentation in Tagen statt Monaten
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Betroffenheitsprüfung, KI-Dokumente, Maßnahmenstatus und vollständiger
            Audit-Ordner-Export in einem System.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg">
                Kostenlosen NIS2-Check starten
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg">
                Demo ansehen
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16" id="problem">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Das Problem</h2>
              <ul className="mt-6 space-y-3">
                {problemItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-slate-600">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
              <h3 className="text-lg font-semibold text-slate-900">Typische Auswirkungen</h3>
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <p className="text-3xl font-bold text-red-600">72h</p>
                  <p className="text-sm text-slate-500">Meldefrist bei erheblichen Sicherheitsvorfällen</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <p className="text-3xl font-bold text-amber-600">6–12 Mon.</p>
                  <p className="text-sm text-slate-500">Typischer Aufwand für manuelle NIS2-Dokumentation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50 py-16" id="demo">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">Die Lösung</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            TKND NIS2 Control Center führt Unternehmen Schritt für Schritt durch:
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {solutionSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-slate-800">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16" id="funktionen">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">Kernfunktionen</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border border-slate-200 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-brand-600" />
            <h2 className="text-2xl font-bold text-slate-900">Für wen geeignet</h2>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-slate-700 shadow-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16" id="pilot">
        <div className="mx-auto max-w-6xl px-6">
          <div className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white shadow-sm">
            <div className="grid gap-8 p-8 lg:grid-cols-2 lg:items-center lg:p-12">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Pilotpaket</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">Pilotzugang für IT-Systemhäuser</h2>
                <ul className="mt-6 space-y-2">
                  {pilotIncludes.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-slate-500">
                  Keine Rechtsberatung. Das System unterstützt bei Struktur, Dokumentation und Nachweisführung.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-4xl font-bold text-slate-900">499 €</p>
                <p className="text-slate-500">Setup</p>
                <p className="mt-4 text-2xl font-bold text-brand-600">+ 99 €/Monat</p>
                <p className="text-sm text-slate-500">während der Pilotphase</p>
                <Button className="mt-6 w-full" size="lg" onClick={() => setPilotOpen(true)}>
                  Pilotzugang anfragen
                </Button>
                <Link href="/pricing" className="mt-3 block text-sm text-brand-600 hover:underline">
                  Alle Pakete ansehen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold">Bereit für Ihren NIS2-Pilot?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Starten Sie mit dem kostenlosen Check oder erkunden Sie die Demo mit Beispieldaten.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-brand-500 hover:bg-brand-400" onClick={() => setPilotOpen(true)}>
              Pilotzugang anfragen
            </Button>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-800">
                Demo starten
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
