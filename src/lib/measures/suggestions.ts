import type { AssetCategory } from "@/lib/assets/types";
import { resolveRiskAsset } from "@/lib/assets/resolve";
import type { CompanyAsset } from "@/lib/assets/types";
import type { Risk } from "@/lib/types";

export interface MeasureSuggestion {
  title: string;
  description: string;
  target_state: string;
}

function matchPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function suggestMeasureFromRisk(input: {
  threat?: string | null;
  vulnerability?: string | null;
  measure?: string | null;
  assetName: string;
  assetCategory?: AssetCategory;
}): MeasureSuggestion {
  const context = [
    input.threat ?? "",
    input.vulnerability ?? "",
    input.measure ?? "",
    input.assetName,
  ]
    .join(" ")
    .toLowerCase();

  if (
    matchPattern(context, [
      /backup|wiederherstellung|datensicherung|datenverlust/,
    ])
  ) {
    return {
      title: "Backup-Konzept erstellen und regelmäßige Tests dokumentieren",
      description: `Wiederherstellungsfähigkeit für ${input.assetName} sicherstellen.`,
      target_state: "Backup- und Restore-Test erfolgreich dokumentiert",
    };
  }

  if (
    matchPattern(context, [
      /schulung|awareness|phishing|mitarbeit|benutzer|fehlverhalten/,
    ])
  ) {
    return {
      title: "Sicherheitsschulung für Mitarbeitende durchführen und Teilnahme dokumentieren",
      description: `Sensibilisierung zu ${input.threat ?? "Sicherheitsrisiken"} für ${input.assetName}.`,
      target_state: "Schulung durchgeführt und Teilnehmerliste archiviert",
    };
  }

  if (
    matchPattern(context, [
      /zugriff|mfa|passwort|konto|authentifizierung|berechtigung/,
    ])
  ) {
    return {
      title: "Zugriffskonzept definieren und Rollenverteilung dokumentieren",
      description: `Zugriffskontrollen für ${input.assetName} prüfen und festlegen.`,
      target_state: "Zugriffsrechte geprüft und im Nachweis dokumentiert",
    };
  }

  if (
    matchPattern(context, [
      /dienstleister|lieferant|anbieter|lieferkette/,
    ])
  ) {
    return {
      title: "Kritische Dienstleister erfassen und Sicherheitsbewertung dokumentieren",
      description: `Lieferantenrisiko für ${input.assetName} bewerten.`,
      target_state: "Lieferantenbewertung im Audit-Ordner abgelegt",
    };
  }

  if (matchPattern(context, [/patch|update|endgerät|software|veraltet/])) {
    return {
      title: "Patch-Verantwortung festlegen und Update-Zyklus dokumentieren",
      description: `Aktualisierungsprozess für ${input.assetName} definieren.`,
      target_state: "Patch-Prozess schriftlich festgelegt und verantwortet",
    };
  }

  if (matchPattern(context, [/cloud|m365|microsoft|saas/])) {
    return {
      title: "MFA für alle relevanten Benutzerkonten aktivieren und dokumentieren",
      description: `Zugangsschutz für ${input.assetName} umsetzen.`,
      target_state: "MFA-Nachweis für alle relevanten Konten vorhanden",
    };
  }

  const categoryHint =
    input.assetCategory === "data"
      ? "Datenschutz- und Verfügbarkeitsanforderungen umsetzen und dokumentieren"
      : input.assetCategory === "external_providers"
        ? "Vertragliche und technische Sicherheitsanforderungen beim Dienstleister prüfen"
        : `Konkrete Schutzmaßnahme für ${input.assetName} umsetzen und dokumentieren`;

  return {
    title: categoryHint,
    description: input.threat
      ? `Gegenmaßnahme zu: ${input.threat}`
      : `Risikobezogene Maßnahme für ${input.assetName}.`,
    target_state: "Maßnahme umgesetzt und Nachweis im Audit-Ordner abgelegt",
  };
}

export function suggestMeasureForRisk(
  risk: Risk,
  assets: CompanyAsset[]
): MeasureSuggestion {
  const resolved = resolveRiskAsset(risk, assets);

  if (risk.measure && !/\b(fehlend|unzureichend|mangelnd)\b/i.test(risk.measure)) {
    return {
      title: risk.measure,
      description: `Abgeleitet aus Risiko: ${risk.threat}`,
      target_state: "Maßnahme umgesetzt und dokumentiert",
    };
  }

  return suggestMeasureFromRisk({
    threat: risk.threat,
    vulnerability: risk.vulnerability,
    measure: risk.measure,
    assetName: resolved.name,
    assetCategory: resolved.category,
  });
}
