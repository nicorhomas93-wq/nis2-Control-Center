/**
 * Zentrale Textnormalisierung für generierte NIS2-Dokumente.
 */

const TYPO_REPLACEMENTS: [RegExp, string][] = [
  [/Cvber-Bedrohungen/gi, "Cyber-Bedrohungen"],
  [/Cvber-Angriffe/gi, "Cyber-Angriffe"],
  [/Cvber-Sicherheit/gi, "Cyber-Sicherheit"],
  [/Cvber/gi, "Cyber"],
  [/\btraat\b/gi, "trägt"],
  [/\biedoch\b/g, "jedoch"],
  [/gegebenenfalis/gi, "gegebenenfalls"],
  [/aeaebenfalls/gi, "gegebenenfalls"],
  [/Nutzuna/gi, "Nutzung"],
  [/Bedeutuna/gi, "Bedeutung"],
  [/Umsetzuna/gi, "Umsetzung"],
  [/Sicherheitskonzents/gi, "Sicherheitskonzepts"],
  [/NIS2Richtlinie/gi, "NIS2-Richtlinie"],
  [/NIS2Umsetzung/gi, "NIS2-Umsetzung"],
  [/NIS2Status/gi, "NIS2-Status"],
  [/NIS2Compliance/gi, "NIS2-Compliance"],
  [/ICTDienstleistungen/gi, "ICT-Dienstleistungen"],
  [/ICTDienstleister/gi, "ICT-Dienstleister"],
  [/ITDienstleisters/gi, "IT-Dienstleisters"],
  [/ITDienstleister/gi, "IT-Dienstleister"],
  [/CyberBedrohungen/gi, "Cyber-Bedrohungen"],
  [/CyberAngriffe/gi, "Cyber-Angriffe"],
  [/CyberSicherheit/gi, "Cyber-Sicherheit"],
  [/Netzwerkund/gi, "Netzwerk- und"],
  [/Informationssicherheitsleitliniefür/gi, "Informationssicherheitsleitlinie für"],
];

export const QUALITY_FORBIDDEN_FRAGMENTS = [
  "traat",
  "Nutzuna",
  "Bedeutuna",
  "Umsetzuna",
  "Sicherheitskonzents",
  "CyberBedrohungen",
  "NIS2Richtlinie",
  "Netzwerkund",
  "ICTDienstleistungen",
  "ITDienstleister",
  "Cvber",
  "iedoch",
  "aeaeb",
  "gegebenenfalis",
] as const;

/** @deprecated Nutze QUALITY_FORBIDDEN_FRAGMENTS */
export const FORBIDDEN_FRAGMENTS = QUALITY_FORBIDDEN_FRAGMENTS;

export const DOCUMENT_QUALITY_WARNING =
  "Dokument enthält möglicherweise unbereinigte Textfragmente.";

export type DocumentQualityResult = {
  ok: boolean;
  fragments: string[];
};

export function normalizeGeneratedDocumentText(text: string): string {
  let result = text.replace(/\r\n/g, "\n");

  for (const [pattern, replacement] of TYPO_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/([.!?;:])([A-ZÄÖÜ„])/g, "$1 $2");
  result = result.replace(/([a-zäöüß]),([A-Za-zÄÖÜäöüß])/g, "$1, $2");
  result = result.replace(/ +([.,;:!?])/g, "$1");
  result = result.replace(/[ \t]{2,}/g, " ");
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

/** @deprecated Alias — nutze normalizeGeneratedDocumentText */
export function normalizeDocumentText(text: string): string {
  return normalizeGeneratedDocumentText(text);
}

export function checkDocumentQuality(text: string): DocumentQualityResult {
  const fragments = QUALITY_FORBIDDEN_FRAGMENTS.filter((frag) => text.includes(frag));
  return { ok: fragments.length === 0, fragments: [...fragments] };
}

export function containsForbiddenFragments(text: string): boolean {
  return !checkDocumentQuality(text).ok;
}

/**
 * Normalisiert Text und wiederholt bei verbotenen Fragmenten (Qualitätssicherung).
 */
export function validateAndNormalizeDocumentText(text: string): string {
  let normalized = normalizeGeneratedDocumentText(text);
  let attempts = 0;

  while (containsForbiddenFragments(normalized) && attempts < 3) {
    normalized = normalizeGeneratedDocumentText(normalized);
    attempts++;
  }

  return normalized;
}

/**
 * Normalisiert Dokumenttext und prüft die Qualität (Konsole + Rückgabe für UI).
 */
export function prepareDocumentText(text: string): {
  text: string;
  quality: DocumentQualityResult;
} {
  const normalized = validateAndNormalizeDocumentText(text);
  const quality = checkDocumentQuality(normalized);

  if (!quality.ok) {
    console.warn(
      "[TKND NIS2] Dokument enthält möglicherweise unbereinigte Textfragmente:",
      quality.fragments.join(", ")
    );
  }

  return { text: normalized, quality };
}
