const PLACEHOLDER_PATTERNS = [
  /^[-–—\s]+$/,
  /^it-system$/i,
  /^unbekannt(e)?$/i,
  /^n\/a$/i,
  /^nicht angegeben$/i,
];

export function isPlaceholderValue(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(trimmed));
}

export function displayRiskField(
  value: string | null | undefined,
  fallback: string
): string {
  return isPlaceholderValue(value) ? fallback : value!.trim();
}

export function deriveRiskProblemTitle(input: {
  asset: string;
  threat: string;
  vulnerability?: string | null;
  measure?: string | null;
}): string {
  const measure = input.measure?.trim();
  if (measure && !isPlaceholderValue(measure)) {
    const short = measure.length > 72 ? `${measure.slice(0, 69)}…` : measure;
    return short.charAt(0).toUpperCase() + short.slice(1);
  }

  const threat = displayRiskField(input.threat, "");
  const asset = displayRiskField(input.asset, "");

  if (threat && asset) {
    return `${threat} (${asset})`;
  }
  if (threat) return threat;

  const vuln = displayRiskField(input.vulnerability, "");
  if (vuln && asset) return `${vuln} bei ${asset}`;

  return "Offenes Sicherheitsrisiko ohne definierte Maßnahme";
}

export const RISK_FIELD_FALLBACKS = {
  asset: "Asset noch nicht bewertet",
  threat: "Bedrohung noch nicht bewertet",
  vulnerability: "Schwachstelle noch nicht bewertet",
  measure: "Maßnahme noch nicht definiert",
  businessImpact: "Business Impact noch nicht bewertet",
  responsible: "Verantwortlichkeit noch nicht zugewiesen",
  deadline: "Frist noch nicht gesetzt",
} as const;
