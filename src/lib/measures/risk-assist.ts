import type { RiskLevel } from "@/lib/types";
import type { AssetCategory } from "@/lib/assets/types";
import { resolveRiskAsset } from "@/lib/assets/resolve";
import type { CompanyAsset } from "@/lib/assets/types";
import type { Risk } from "@/lib/types";
import {
  type MeasureSuggestion,
  suggestMeasureFromRisk,
} from "@/lib/measures/suggestions";

function matchContext(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function buildContext(risk: Risk, assetName: string): string {
  return [
    risk.threat,
    risk.vulnerability,
    risk.measure,
    assetName,
    risk.business_impact,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function suggestion(
  title: string,
  description: string,
  target_state: string
): MeasureSuggestion {
  return { title, description, target_state };
}

/** 2–4 konkrete Maßnahmen-Vorschläge für ein Risiko. */
export function buildMeasureSuggestions(
  risk: Risk,
  assets: CompanyAsset[]
): MeasureSuggestion[] {
  const resolved = resolveRiskAsset(risk, assets);
  const ctx = buildContext(risk, resolved.name);
  const out: MeasureSuggestion[] = [];
  const seen = new Set<string>();

  function add(s: MeasureSuggestion) {
    const key = s.title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  }

  if (
    matchContext(ctx, [
      /zugriff|mfa|passwort|konto|authentifizierung|berechtigung|rollen/,
    ]) ||
    resolved.name.toLowerCase().includes("microsoft") ||
    resolved.name.toLowerCase().includes("cloud")
  ) {
    add(
      suggestion(
        "MFA für alle Benutzer aktivieren und dokumentieren",
        `Zugangsschutz für ${resolved.name} umsetzen.`,
        "MFA-Nachweis für alle relevanten Konten vorhanden"
      )
    );
    add(
      suggestion(
        "Rollen- und Berechtigungskonzept definieren",
        `Klare Rollen und Rechte für ${resolved.name} festlegen.`,
        "Berechtigungskonzept im Audit-Ordner abgelegt"
      )
    );
    add(
      suggestion(
        "Regelmäßige Berechtigungsprüfung einführen",
        `Zugriffsrechte für ${resolved.name} quartalsweise prüfen.`,
        "Prüfprotokoll mit Datum und Verantwortlichem dokumentiert"
      )
    );
  }

  if (matchContext(ctx, [/backup|wiederherstellung|datensicherung|datenverlust/])) {
    add(
      suggestion(
        "Backup-Konzept erstellen und regelmäßige Tests dokumentieren",
        `Wiederherstellung für ${resolved.name} verifizieren.`,
        "Restore-Test erfolgreich dokumentiert"
      )
    );
    add(
      suggestion(
        "Backup-Wiederherstellung testen und Ergebnis archivieren",
        `Praxis-Test für ${resolved.name} durchführen.`,
        "Testprotokoll im Audit-Ordner abgelegt"
      )
    );
  }

  if (matchContext(ctx, [/schulung|awareness|phishing|mitarbeit|fehlverhalten/])) {
    add(
      suggestion(
        "Sicherheitsschulung für Mitarbeitende durchführen und Teilnahme dokumentieren",
        `Sensibilisierung zu ${risk.threat ?? "Sicherheitsrisiken"}.`,
        "Teilnehmerliste und Schulungsnachweis archiviert"
      )
    );
    add(
      suggestion(
        "Phishing-Simulation durchführen und Ergebnisse auswerten",
        `Praxistest für ${resolved.name} zur Stärkung der Awareness.`,
        "Simulationsbericht dokumentiert"
      )
    );
  }

  if (matchContext(ctx, [/dienstleister|lieferant|anbieter|lieferkette/])) {
    add(
      suggestion(
        "Kritische Dienstleister erfassen und Sicherheitsbewertung dokumentieren",
        `Lieferantenrisiko für ${resolved.name} bewerten.`,
        "Lieferantenbewertung im Audit-Ordner"
      )
    );
    add(
      suggestion(
        "Vertragliche Sicherheitsanforderungen mit Dienstleistern vereinbaren",
        `SLA und Sicherheitsklauseln für ${resolved.name} prüfen.`,
        "Vertragsnachweise aktualisiert"
      )
    );
  }

  if (matchContext(ctx, [/patch|update|endgerät|software|veraltet/])) {
    add(
      suggestion(
        "Patch-Verantwortung festlegen und Update-Zyklus dokumentieren",
        `Aktualisierungsprozess für ${resolved.name}.`,
        "Patch-Richtlinie veröffentlicht"
      )
    );
    add(
      suggestion(
        "Software-Stand auf allen Endgeräten prüfen und dokumentieren",
        `Inventur und Updates für ${resolved.name}.`,
        "Prüfbericht mit offenen Punkten archiviert"
      )
    );
  }

  if (out.length === 0) {
    add(suggestMeasureFromRisk({
      threat: risk.threat,
      vulnerability: risk.vulnerability,
      measure: risk.measure,
      assetName: resolved.name,
      assetCategory: resolved.category,
    }));
    add(
      suggestion(
        `Schutzmaßnahme für ${resolved.name} umsetzen und Nachweis dokumentieren`,
        risk.threat ? `Gegenmaßnahme zu: ${risk.threat}` : "Konkrete Umsetzung planen.",
        "Maßnahme im Audit-Ordner nachweisbar"
      )
    );
  }

  if (risk.measure && !/\b(fehlend|unzureichend|mangelnd)\b/i.test(risk.measure)) {
    add(
      suggestion(
        risk.measure,
        "Bereits vorgeschlagene Maßnahme aus der Risikoanalyse.",
        "Maßnahme umgesetzt und dokumentiert"
      )
    );
  }

  return out.slice(0, 4);
}

export function inferResponsibleForAsset(
  assetName: string,
  category: AssetCategory
): string {
  const n = assetName.toLowerCase();
  if (
    n.includes("mitarbeit") ||
    n.includes("benutzer") ||
    n.includes("personal") ||
    category === "organization"
  ) {
    return "HR / Management";
  }
  if (
    n.includes("dienstleister") ||
    n.includes("lieferant") ||
    n.includes("extern") ||
    category === "external_providers"
  ) {
    return "Einkauf / Management";
  }
  if (category === "data") {
    return "Datenschutz / IT-Leitung";
  }
  return "IT-Leitung";
}

export function inferDeadlineForRiskLevel(level: RiskLevel): string {
  const days = level === "high" ? 30 : level === "medium" ? 60 : 90;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function calculateMeasureScoreImpact(level: RiskLevel): {
  securityPoints: number;
  auditPoints: number;
  label: string;
} {
  if (level === "high") {
    return {
      securityPoints: 10,
      auditPoints: 5,
      label: "Hohes Risiko",
    };
  }
  if (level === "medium") {
    return {
      securityPoints: 5,
      auditPoints: 3,
      label: "Mittleres Risiko",
    };
  }
  return {
    securityPoints: 3,
    auditPoints: 2,
    label: "Niedriges Risiko",
  };
}

export interface RiskAssistPrefill {
  measure: string;
  deadline: string;
  responsible: string;
  isMandatory: boolean;
  criticality: string;
}

export function buildRiskAssistPrefill(
  risk: Risk,
  assets: CompanyAsset[]
): RiskAssistPrefill {
  const suggestions = buildMeasureSuggestions(risk, assets);
  const resolved = resolveRiskAsset(risk, assets);
  const primary = suggestions[0];

  return {
    measure: primary?.title ?? "",
    deadline: risk.deadline?.slice(0, 10) ?? inferDeadlineForRiskLevel(risk.risk_level),
    responsible:
      risk.responsible?.trim() ||
      inferResponsibleForAsset(resolved.name, resolved.category),
    isMandatory: risk.is_mandatory ?? risk.risk_level !== "low",
    criticality:
      risk.criticality ??
      (risk.risk_level === "high" ? "critical" : risk.risk_level === "medium" ? "high" : "medium"),
  };
}
