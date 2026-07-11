import type { AssessmentResult, Company, Nis2Status } from "@/lib/types";
import {
  criticalityBoostForNis2Score,
  hasHighCriticalityIndicators,
  parseCriticalityArrays,
} from "@/lib/nis2/criticality-assessment";

const ANNEX_I_INDUSTRIES = [
  "energie", "transport", "bankwesen", "finanzmarkt", "gesundheit",
  "trinkwasser", "abwasser", "digitale infrastruktur", "ict",
  "öffentliche verwaltung", "weltraum",
];

const ANNEX_II_INDUSTRIES = [
  "post", "abfall", "chemie", "lebensmittel", "produktion",
  "verarbeitendes gewerbe", "digitale dienste", "forschung",
];

function isRelevantSector(industry: string | null): boolean {
  if (!industry) return false;
  const n = industry.toLowerCase();
  return ANNEX_I_INDUSTRIES.some((s) => n.includes(s)) ||
    ANNEX_II_INDUSTRIES.some((s) => n.includes(s));
}

function meetsSizeThreshold(company: Company) {
  const employees = company.employee_count ?? 0;
  const revenue = company.annual_revenue ?? 0;
  const balance = company.balance_sheet_total ?? 0;
  const medium = employees >= 50 && (revenue >= 10_000_000 || balance >= 2_000_000);
  const large = employees >= 250 && (revenue >= 50_000_000 || balance >= 43_000_000);
  return { medium, large };
}

export function assessNis2(company: Company): AssessmentResult {
  if (!company.company_name || !company.industry) {
    return {
      status: "unbekannt",
      reasoning: "Unternehmensprofil unvollständig. Bitte Unternehmensname und Branche erfassen.",
      score: 0,
      nextSteps: ["Unternehmensprofil vervollständigen", "Betroffenheitscheck erneut durchführen"],
    };
  }

  const { medium, large } = meetsSizeThreshold(company);
  const sectorRelevant = isRelevantSector(company.industry);
  const digitalExposure =
    company.uses_cloud_services ||
    company.uses_microsoft_365 ||
    company.publicly_accessible_systems ||
    company.has_it_service_provider;

  const criticality = parseCriticalityArrays(company);
  const hasCriticalProcesses = criticality.business_criticality_types.length > 0;
  const highCriticality = hasHighCriticalityIndicators(company);
  const scoreBoost = criticalityBoostForNis2Score(company);

  if (sectorRelevant && large) {
    return {
      status: "wahrscheinlich_besonders_wichtige_einrichtung",
      reasoning: `Das Unternehmen ist in einem NIS2-regulierten Sektor (${company.industry}) tätig und erfüllt die Schwellenwerte einer großen Unternehmung.${highCriticality ? " Die Kritikalitätsbewertung bestätigt einen erhöhten Schutzbedarf." : ""}`,
      score: Math.min(85 + scoreBoost, 100),
      nextSteps: [
        "Registrierung bei der zuständigen Behörde prüfen",
        "Umfassendes ISMS nach NIS2 aufbauen",
        "Meldeprozesse für Sicherheitsvorfälle etablieren",
        "Lieferketten-Risikoanalyse durchführen",
      ],
    };
  }

  if (sectorRelevant && medium) {
    return {
      status: "wahrscheinlich_wichtige_einrichtung",
      reasoning: `Das Unternehmen ist in einem regulierten Sektor (${company.industry}) tätig und erfüllt die Größenschwellenwerte.${highCriticality ? " Die dokumentierte Kritikalität unterstützt eine erhöhte Betroffenheit." : ""}`,
      score: Math.min(70 + scoreBoost, 95),
      nextSteps: [
        "NIS2-Pflichten für wichtige Einrichtungen umsetzen",
        "Risikoanalyse und Maßnahmenplan erstellen",
        "Incident-Response-Prozess definieren",
      ],
    };
  }

  if (digitalExposure && (medium || company.eu_operations)) {
    return {
      status: "moeglicherweise_betroffen",
      reasoning: "Digitale Infrastruktur, EU-Tätigkeit oder Größenschwellen sprechen für eine mögliche NIS2-Betroffenheit." +
        (hasCriticalProcesses ? " Geschäftskritische Prozesse wurden in der Kritikalitätsbewertung dokumentiert." : ""),
      score: Math.min(45 + scoreBoost, 75),
      nextSteps: [
        "Rechtliche Einordnung durch Fachberatung prüfen",
        "Vorläufige Risikoanalyse durchführen",
        "Grundlegende Sicherheitsdokumentation erstellen",
      ],
    };
  }

  if (highCriticality) {
    return {
      status: "moeglicherweise_betroffen",
      reasoning: "Die Kritikalitätsbewertung weist auf geschäftlich oder technisch relevante Abhängigkeiten hin, die eine NIS2-Prüfung nahelegen.",
      score: Math.min(40 + scoreBoost, 65),
      nextSteps: [
        "Rechtliche Einordnung durch Fachberatung prüfen",
        "Kritikalitätsbewertung in Risikoanalyse übernehmen",
        "Grundlegende Sicherheitsdokumentation erstellen",
      ],
    };
  }

  return {
    status: "nicht_betroffen",
    reasoning: "Aktuell liegen keine eindeutigen NIS2-Betroffenheitsindikatoren vor.",
    score: 15,
    nextSteps: [
      "Jährliche Neubewertung bei Unternehmenswachstum",
      "Grundlegende IT-Sicherheitsmaßnahmen beibehalten",
    ],
  };
}

export function getNis2StatusLabel(status: Nis2Status): string {
  const labels: Record<Nis2Status, string> = {
    unbekannt: "Unbekannt",
    nicht_betroffen: "Nicht betroffen",
    moeglicherweise_betroffen: "Möglicherweise betroffen",
    wahrscheinlich_wichtige_einrichtung: "Wahrscheinlich wichtige Einrichtung",
    wahrscheinlich_besonders_wichtige_einrichtung: "Wahrscheinlich besonders wichtige Einrichtung",
  };
  return labels[status];
}

export function getNis2StatusColor(status: Nis2Status): string {
  const colors: Record<Nis2Status, string> = {
    unbekannt: "bg-slate-100 text-slate-700",
    nicht_betroffen: "bg-emerald-100 text-emerald-800",
    moeglicherweise_betroffen: "bg-amber-100 text-amber-800",
    wahrscheinlich_wichtige_einrichtung: "bg-orange-100 text-orange-800",
    wahrscheinlich_besonders_wichtige_einrichtung: "bg-red-100 text-red-800",
  };
  return colors[status];
}

export const ASSESSMENT_DISCLAIMER =
  "Diese Einschätzung ist keine Rechtsberatung und dient ausschließlich der internen Orientierung.";
