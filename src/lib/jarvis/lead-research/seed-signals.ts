import type { ResearchSignalType } from "@/lib/jarvis/lead-research/constants";

export const DEMO_RESEARCH_SIGNALS: Array<{
  company_name: string;
  signal_type: ResearchSignalType;
  source_platform: string;
  title: string;
  description: string;
  industry: string;
  region: string;
}> = [
  {
    company_name: "Mittelstand Maschinenbau Süd GmbH",
    signal_type: "tender",
    source_platform: "bund.de",
    title: "Einführung ISMS nach ISO 27001 inkl. NIS2-Vorbereitung",
    description:
      "Ausschreibung zur Einführung eines Informationssicherheits-Managementsystems, Risikomanagement und Dokumentation für NIS2-Compliance.",
    industry: "Maschinenbau",
    region: "Bayern",
  },
  {
    company_name: "Logistik Nord Service AG",
    signal_type: "job",
    source_platform: "Stepstone",
    title: "Informationssicherheitsbeauftragter (ISB) (m/w/d)",
    description:
      "Aufbau ISMS, Schnittstelle zu Audit und Lieferantenbewertung, Erfahrung mit NIS2 wünschenswert.",
    industry: "Logistik",
    region: "Hamburg",
  },
  {
    company_name: "CloudSecure MSP GmbH",
    signal_type: "announcement",
    source_platform: "LinkedIn",
    title: "Wir unterstützen Kunden bei NIS2-Nachweisen",
    description:
      "Pressemitteilung: Ausbau Cybersecurity-Beratung und zentrale Nachweisdokumentation für MSP-Mandanten.",
    industry: "MSP",
    region: "Dresden",
  },
];
