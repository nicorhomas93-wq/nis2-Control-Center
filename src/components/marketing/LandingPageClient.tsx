"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck,
  FolderArchive,
  Shield,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { trackCtaClick } from "@/lib/acquisition/client";

const problemItems = [
  {
    title: "Sie wissen nicht, ob Sie betroffen sind.",
    consequence: "Sie investieren in die falschen Maßnahmen — oder gar nichts.",
  },
  {
    title: "Ihre Dokumentation ist lückenhaft oder verstreut.",
    consequence: "Bei einer Prüfung oder einem Vorfall fehlen Nachweise. Das kostet Vertrauen, Aufträge und Geld.",
  },
  {
    title: "Risiken und Maßnahmen sind nicht nachvollziehbar.",
    consequence: "'Wir arbeiten daran' reicht nicht. Sie müssen zeigen, was getan wurde.",
  },
  {
    title: "Audit-Vorbereitung frisst Monate.",
    consequence: "Währenddessen läuft Ihr Betrieb. Die Pflicht auch.",
  },
];

const triggerStats = [
  {
    value: "72h",
    label: "Meldefrist bei erheblichen Sicherheitsvorfällen",
    color: "text-red-600",
  },
  {
    value: "6–12 Mon.",
    label: "Typischer Aufwand für manuelle NIS2-Dokumentation",
    color: "text-amber-600",
  },
  {
    value: "1 Vorfall",
    label: "Genügt, um jede Lücke sichtbar zu machen",
    color: "text-slate-900",
  },
];

const solutionSteps = [
  { title: "Unternehmensprofil", detail: "Ihre Ausgangslage, sauber erfasst" },
  { title: "Betroffenheit prüfen", detail: "Klarheit statt Bauchgefühl" },
  { title: "Pflichtdokumente erstellen", detail: "In Minuten, nicht in Wochen" },
  { title: "Maßnahmen verfolgen", detail: "Offen, erledigt, nachweisbar" },
  { title: "Risiken dokumentieren", detail: "Sichtbar, bewertet, nachvollziehbar" },
  { title: "Vorfälle vorbereiten", detail: "Prozess steht, bevor es passiert" },
  { title: "Audit-Ordner exportieren", detail: "Alles an einem Ort, abgabefertig" },
];

const features = [
  {
    icon: ShieldCheck,
    title: "In 3 Minuten wissen, ob Ihr Unternehmen unter NIS2 fallen könnte",
    description: "Klare Einordnung auf Basis Ihrer Unternehmensdaten — statt Rätselraten.",
  },
  {
    icon: FileCheck,
    title: "Alle notwendigen NIS2-Dokumente in Minuten erstellen",
    description: "Leitlinien, Risikoanalysen, Incident-Pläne: fertig, nicht angefangen.",
  },
  {
    icon: ClipboardList,
    title: "Prüfbare PDFs auf Knopfdruck — versioniert und ablagefertig",
    description: "Kein Suchen, kein Umbenennen, kein Chaos vor der Prüfung.",
  },
  {
    icon: Shield,
    title: "Risiken sichtbar machen, bevor sie zum Problem werden",
    description: "Dokumentiert und nachvollziehbar — nicht nur im Kopf des IT-Leiters.",
  },
  {
    icon: Zap,
    title: "Immer wissen, welche Maßnahmen noch offen sind",
    description: "Keine vergessene Aufgabe, kein 'das machen wir noch'.",
  },
  {
    icon: AlertTriangle,
    title: "Im Ernstfall nicht improvisieren",
    description: "Prozess und Dokumentation stehen — bevor der Vorfall kommt.",
  },
  {
    icon: Clock,
    title: "Auf einen Blick sehen, wie weit Sie wirklich sind",
    description: "Kein Schönrechnen. Ein ehrlicher Stand vor jeder Prüfung.",
  },
  {
    icon: FolderArchive,
    title: "Einen kompletten Audit-Ordner mit einem Klick exportieren",
    description: "10 Dokumentbereiche. Ein Paket. Prüfbereit.",
  },
];

const trustPoints = [
  "Verständlich für Geschäftsführer — kein IT-Fachchinesisch",
  "Prüfbare Struktur — Dokumente, Maßnahmen, Risiken an einem Ort",
  "Ein System, ein Stand — kein 'wo lag das nochmal?'",
  "Persönliches Onboarding im Pilot — Sie starten nicht allein",
  "Keine Rechtsberatung — Struktur und Nachweisführung, nicht juristische Beratung",
];

const audiences = [
  "Geschäftsführer und Geschäftsführerinnen",
  "IT-Leiter ohne Compliance-Team",
  "IT-Systemhäuser und Berater",
  "Compliance- und Datenschutz-Berater",
  "Unternehmen mit digitaler Infrastruktur",
  "Microsoft-365-Nutzer im Mittelstand",
];

function PrimaryCta({ className = "" }: { className?: string }) {
  return (
    <Link href="/check" onClick={() => trackCtaClick("landing_primary")}>
      <Button size="lg" className={className}>
        Kostenlosen NIS2-Check starten
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );
}

function SecondaryCta({ className = "" }: { className?: string }) {
  return (
    <Link href="/demo">
      <Button variant="outline" size="lg" className={className}>
        Demo ansehen
      </Button>
    </Link>
  );
}

function SectionCta() {
  return (
    <div className="mt-10 flex justify-center">
      <PrimaryCta />
    </div>
  );
}

export function LandingPageClient() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            <Shield className="h-4 w-4" />
            NIS2 betrifft mehr Mittelständler als Sie denken
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Sind Sie NIS2-pflichtig — und können Sie das morgen beweisen?
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Die meisten Geschäftsführer wissen es nicht. Die Dokumente fehlen. Und wenn ein
            Vorfall kommt oder jemand fragt, stehen Sie da — ohne Nachweis, ohne Struktur,
            ohne Antwort.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-slate-800">
            Das TKND NIS2 Control Center bringt Sie von der Betroffenheitsprüfung bis zum
            fertigen Audit-Ordner. Nicht irgendwann. Jetzt.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta />
            <SecondaryCta />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            3 Minuten · Keine Kreditkarte · Sofort Ergebnis
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16" id="problem">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            NIS2 wartet nicht, bis Sie fertig sind
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Sie haben ein Unternehmen zu führen. Nicht wochenlang Vorlagen zu suchen oder
            Berater anzurufen, die Ihnen sagen, was Sie hätten wissen müssen.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-center font-medium text-slate-800">
            Das passiert ohne klaren Stand:
          </p>
          <ul className="mx-auto mt-10 max-w-3xl space-y-6">
            {problemItems.map((item) => (
              <li
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">→ {item.consequence}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-2xl text-center text-slate-700">
            Jeder Tag ohne Klarheit ist ein Risiko, das Sie nicht sehen — bis jemand danach
            fragt.
          </p>
          <SectionCta />
        </div>
      </section>

      {/* Trigger */}
      <section className="border-y border-slate-100 bg-slate-900 py-16 text-white" id="trigger">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold">72 Stunden. Dann wird es teuer.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Bei einem erheblichen Sicherheitsvorfall haben Sie{" "}
            <strong className="text-white">72 Stunden</strong> zu melden. Nicht nächste Woche.
            Nicht, wenn der Berater zurückruft.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-white">
            Die Frage ist nicht, ob etwas passiert.
            <br />
            Die Frage ist: Sind Sie vorbereitet, wenn es passiert?
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            {triggerStats.map((stat) => (
              <div
                key={stat.value}
                className="rounded-xl border border-slate-700 bg-slate-800 p-5"
              >
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-xl text-slate-300">
            Wer heute keinen Stand hat, verliert morgen Zeit — und die Kontrolle über die
            Situation.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/check">
              <Button size="lg" className="bg-brand-500 hover:bg-brand-400">
                Kostenlosen NIS2-Check starten
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="border-b border-slate-100 bg-slate-50 py-16" id="loesung">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Kein weiteres Tool. Ein System, das Sie durchbringt.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Keine verstreuten PDFs. Kein Dateichaos. Kein Rätselraten vor der Prüfung.
          </p>
          <p className="mx-auto mt-2 text-center font-medium text-slate-800">
            So kommen Sie von Unsicherheit zu Nachweis:
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {solutionSteps.map((step, i) => (
              <div
                key={step.title}
                className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-xl text-center text-lg font-bold text-slate-900">
            Am Ende haben Sie kein gutes Gefühl. Sie haben Nachweise.
          </p>
          <SectionCta />
        </div>
      </section>

      {/* Features */}
      <section className="py-16" id="funktionen">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Was Sie davon haben — in Klartext
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
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
          <SectionCta />
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-slate-100 bg-slate-50 py-16" id="trust">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-center gap-3">
            <Users className="h-6 w-6 text-brand-600" />
            <h2 className="text-center text-3xl font-bold text-slate-900">
              Für deutsche KMU gebaut — nicht für Konzerne mit Compliance-Abteilung
            </h2>
          </div>
          <ul className="mx-auto mt-8 max-w-2xl space-y-3">
            {trustPoints.map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
            Geeignet für
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-slate-700 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
          <SectionCta />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold">Wissen Sie heute, wo Sie stehen?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Wenn nicht: In 3 Minuten haben Sie Klarheit.
            <br />
            Wenn ja: Dann wissen Sie auch, was als Nächstes fehlt.
          </p>
          <p className="mx-auto mt-4 max-w-xl font-medium text-white">
            Jeder Tag ohne Stand ist ein Tag, an dem Sie nicht handlungsfähig sind.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/check">
              <Button size="lg" className="bg-brand-500 hover:bg-brand-400">
                Kostenlosen NIS2-Check starten
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 bg-transparent text-white hover:bg-slate-800"
              >
                Demo ansehen
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">Keine Kreditkarte · Sofort Ergebnis</p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
