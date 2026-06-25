import Link from "next/link";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const sections = [
  {
    title: "Keine Rechtsberatung",
    text: "TKND NIS2 Control Center stellt keine Rechtsberatung dar. Die Inhalte ersetzen keine individuelle rechtliche oder fachliche Prüfung durch qualifizierte Stellen.",
  },
  {
    title: "Keine Garantie auf vollständige NIS2-Konformität",
    text: "Das System unterstützt bei Strukturierung, Dokumentation und Nachweisführung. Eine vollständige NIS2-Konformität kann nicht garantiert werden. Die finale Einordnung und Umsetzung ist im Einzelfall zu prüfen.",
  },
  {
    title: "Qualifizierte Bewertung erforderlich",
    text: "Die finale juristische und fachliche Bewertung muss durch qualifizierte Stellen (z. B. Rechtsanwälte, Wirtschaftsprüfer, ISB mit entsprechender Qualifikation) erfolgen.",
  },
  {
    title: "KI-generierte Inhalte",
    text: "KI-generierte Dokumente und Zusammenfassungen müssen vor Verwendung in Audits, Verträgen oder gegenüber Behörden geprüft, angepasst und freigegeben werden.",
  },
  {
    title: "Demo-Modus",
    text: "Im Demo-Modus werden Beispieldaten angezeigt. Diese stellen keine echte Betroffenheitsprüfung oder rechtsverbindliche Einschätzung dar.",
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900">Rechtliche Hinweise</h1>
        <p className="mt-4 text-slate-600">
          TKND NIS2 Control Center — Hinweise zur Nutzung und Einordnung
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-2 text-slate-600 leading-relaxed">{s.text}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          <p>
            Weitere Fragen?{" "}
            <Link href="/pricing" className="text-brand-600 hover:underline">
              Preise & Pilot
            </Link>{" "}
            oder Kontakt über die Pilotanfrage auf der Startseite.
          </p>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
