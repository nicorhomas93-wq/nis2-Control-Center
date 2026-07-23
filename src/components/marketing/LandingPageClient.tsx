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
import { SecurityNet } from "@/components/marketing/SecurityNet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { Reveal } from "@/components/ui/Reveal";
import { trackCtaClick } from "@/lib/acquisition/client";
import { cn } from "@/lib/utils";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-600">
      {children}
    </p>
  );
}

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
    countTo: 72,
    suffix: "h",
    label: "Meldefrist bei erheblichen Sicherheitsvorfällen",
    color: "animate-signal",
    glow: true,
  },
  {
    value: "6–12 Mon.",
    label: "Typischer Aufwand für manuelle NIS2-Dokumentation",
    color: "text-amber-400",
    glow: false,
  },
  {
    value: "1 Vorfall",
    label: "Genügt, um jede Lücke sichtbar zu machen",
    color: "text-orange-400",
    glow: false,
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

// Same soft-pastel-per-item language as the app sidebar, so the landing page
// and the product feel like one design system rather than two.
const audienceTones = [
  { tile: "bg-brand-100 text-brand-600", hoverShadow: "hover:shadow-brand-500/15" },
  { tile: "bg-violet-100 text-violet-600", hoverShadow: "hover:shadow-violet-500/15" },
  { tile: "bg-teal-100 text-teal-600", hoverShadow: "hover:shadow-teal-500/15" },
  { tile: "bg-amber-100 text-amber-600", hoverShadow: "hover:shadow-amber-500/15" },
  { tile: "bg-rose-100 text-rose-600", hoverShadow: "hover:shadow-rose-500/15" },
  { tile: "bg-slate-200 text-slate-600", hoverShadow: "hover:shadow-slate-500/15" },
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
      <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="bg-mesh bg-blobs pointer-events-none absolute inset-0" aria-hidden />
        <SecurityNet className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center sm:py-24">
          <div
            className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700"
            style={{ animationDelay: "0ms" }}
          >
            <Shield className="h-4 w-4" />
            NIS2 betrifft mehr Mittelständler als Sie denken
          </div>
          <h1
            className="text-gradient-serious animate-fade-in-up mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Sind Sie NIS2-pflichtig — und können Sie das morgen beweisen?
          </h1>
          <p
            className="animate-slide-in-left mx-auto mt-6 max-w-2xl text-lg text-slate-600"
            style={{ animationDelay: "160ms" }}
          >
            Die meisten Geschäftsführer wissen es nicht. Die Dokumente fehlen. Und wenn ein
            Vorfall kommt oder jemand fragt, stehen Sie da — ohne Nachweis, ohne Struktur,
            ohne Antwort.
          </p>
          <p
            className="animate-slide-in-right mx-auto mt-4 max-w-2xl text-lg font-medium text-slate-800"
            style={{ animationDelay: "220ms" }}
          >
            Das TKND NIS2 Control Center bringt Sie von der Betroffenheitsprüfung bis zum
            fertigen Audit-Ordner. Nicht irgendwann. Jetzt.
          </p>
          <div
            className="animate-fade-in-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "300ms" }}
          >
            <PrimaryCta />
            <SecondaryCta />
          </div>
          <p
            className="animate-fade-in-up mt-4 text-sm text-slate-500"
            style={{ animationDelay: "360ms" }}
          >
            3 Minuten · Keine Kreditkarte · Sofort Ergebnis
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 sm:py-24" id="problem">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="left">
            <Eyebrow>Ausgangslage</Eyebrow>
            <h2 className="mt-2 text-center text-3xl font-bold text-slate-900">
              NIS2 wartet nicht, bis Sie fertig sind
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
              Sie haben ein Unternehmen zu führen. Nicht wochenlang Vorlagen zu suchen oder
              Berater anzurufen, die Ihnen sagen, was Sie hätten wissen müssen.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-center font-medium text-slate-800">
              Das passiert ohne klaren Stand:
            </p>
          </Reveal>
          <ul className="mx-auto mt-10 max-w-3xl space-y-5">
            {problemItems.map((item, i) => (
              <Reveal key={item.title} as="li" delay={i * 60}>
                <Card interactive className="border-l-4 border-l-amber-400 p-5 hover:shadow-amber-500/15">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">→ {item.consequence}</p>
                    </div>
                  </div>
                </Card>
              </Reveal>
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
      <section
        className="relative overflow-hidden border-y border-slate-100 bg-slate-900 py-20 text-white sm:py-24"
        id="trigger"
      >
        <div className="bg-mesh-dark pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <Reveal direction="right">
            <Eyebrow>Der Ernstfall</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold">72 Stunden. Dann wird es teuer.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              Bei einem erheblichen Sicherheitsvorfall haben Sie{" "}
              <strong className="text-white">72 Stunden</strong> zu melden. Nicht nächste
              Woche. Nicht, wenn der Berater zurückruft.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-white">
              Die Frage ist nicht, ob etwas passiert.
              <br />
              Die Frage ist: Sind Sie vorbereitet, wenn es passiert?
            </p>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            {triggerStats.map((stat, i) => (
              <Reveal key={stat.value} delay={i * 80}>
                <div
                  className={cn(
                    "rounded-xl border border-slate-700/80 bg-slate-800/60 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-slate-500 hover:bg-slate-800/80",
                    stat.glow ? "shadow-lg shadow-red-500/20" : "shadow-lg shadow-black/20"
                  )}
                >
                  <p className={`text-3xl font-bold tabular-nums ${stat.color}`}>
                    {stat.countTo ? <CountUp to={stat.countTo} suffix={stat.suffix} /> : stat.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                </div>
              </Reveal>
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
      <section className="border-b border-slate-100 bg-slate-50 py-20 sm:py-24" id="loesung">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="left">
            <Eyebrow>Lösung</Eyebrow>
            <h2 className="mt-2 text-center text-3xl font-bold text-slate-900">
              Kein weiteres Tool. Ein System, das Sie durchbringt.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
              Keine verstreuten PDFs. Kein Dateichaos. Kein Rätselraten vor der Prüfung.
            </p>
            <p className="mx-auto mt-2 text-center font-medium text-slate-800">
              So kommen Sie von Unsicherheit zu Nachweis:
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {solutionSteps.map((step, i) => (
              <Reveal key={step.title} delay={i * 50}>
                <Card interactive className="flex h-full gap-3 p-4 hover:shadow-brand-500/15">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-sm font-bold text-white shadow-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{step.detail}</p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-xl text-center text-lg font-bold text-slate-900">
            Am Ende haben Sie kein gutes Gefühl. Sie haben Nachweise.
          </p>
          <SectionCta />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-24" id="funktionen">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="right">
            <Eyebrow>Nutzen</Eyebrow>
            <h2 className="mt-2 text-center text-3xl font-bold text-slate-900">
              Was Sie davon haben — in Klartext
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }, i) => (
              <Reveal key={title} delay={i * 40}>
                <Card interactive className="h-full p-5 hover:shadow-brand-500/15">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <SectionCta />
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-slate-100 bg-slate-50 py-20 sm:py-24" id="trust">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="left">
            <div className="flex items-center justify-center gap-3">
              <Users className="h-6 w-6 text-brand-600" />
              <h2 className="text-center text-3xl font-bold text-slate-900">
                Für deutsche KMU gebaut — nicht für Konzerne mit Compliance-Abteilung
              </h2>
            </div>
          </Reveal>
          <ul className="mx-auto mt-8 max-w-2xl space-y-3">
            {trustPoints.map((item, i) => (
              <Reveal key={item} as="li" delay={i * 40} className="flex items-center gap-3 text-slate-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </span>
                {item}
              </Reveal>
            ))}
          </ul>
          <p className="mt-10 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
            Geeignet für
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((item, i) => {
              const tone = audienceTones[i % audienceTones.length];
              return (
                <Reveal key={item} as="li" delay={i * 40}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                      tone.hoverShadow
                    )}
                  >
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.tile)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    {item}
                  </div>
                </Reveal>
              );
            })}
          </ul>
          <SectionCta />
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-24 text-white sm:py-28">
        <div className="bg-mesh-dark bg-spotlight-dark pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <Reveal>
            <h2 className="text-4xl font-bold sm:text-5xl">Wissen Sie heute, wo Sie stehen?</h2>
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
                  className="!border-slate-600 !bg-transparent !text-white hover:!bg-slate-800"
                >
                  Demo ansehen
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">Keine Kreditkarte · Sofort Ergebnis</p>
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
