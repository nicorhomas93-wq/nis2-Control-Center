import {
  prepareDocumentText,
  validateAndNormalizeDocumentText,
} from "@/lib/documents/text-normalize";
import type { Document } from "@/lib/types";

export type GenerationMode = "openai" | "demo";

export const GENERATION_MODE_LABELS: Record<GenerationMode, string> = {
  openai: "KI-Modus (OpenAI)",
  demo: "Demo-Modus",
};

export const FINAL_NOTICE_HEADING = "Hinweis zur Einordnung und Rechtsberatung";

const TRAILING_HEADINGS = [
  "## Hinweis zur Einordnung und Rechtsberatung",
  "## Hinweis zur Erzeugung",
  "## Hinweis: Keine Rechtsberatung",
];

function stripTrailingSections(content: string): string {
  let text = content.trimEnd();

  let changed = true;
  while (changed) {
    changed = false;
    for (const marker of TRAILING_HEADINGS) {
      const idx = text.lastIndexOf(marker);
      if (idx !== -1 && idx >= text.length - 1200) {
        text = text.slice(0, idx).trimEnd();
        changed = true;
      }
    }
  }

  const legacyDisclaimer =
    /Hinweis: Dieses Dokument dient der operativen Umsetzung[\s\S]*$/i;
  if (legacyDisclaimer.test(text.slice(-600))) {
    text = text.replace(legacyDisclaimer, "").trimEnd();
  }

  return text;
}

function buildFinalNoticeBody(mode: GenerationMode): string[] {
  const creationLine =
    mode === "openai"
      ? "Dieses Dokument wurde KI-gestützt auf Basis der Unternehmensdaten erstellt."
      : "Dieses Dokument wurde im Demo-Modus automatisch auf Basis der Unternehmensdaten erstellt.";

  return [
    creationLine,
    "Es dient der internen Orientierung und operativen Umsetzung.",
    "Es ersetzt keine individuelle rechtliche oder fachliche Prüfung.",
    "Die finale Einordnung und Umsetzung ist im Einzelfall zu prüfen.",
  ];
}

export function buildFinalNoticeSection(mode: GenerationMode): string {
  const lines = [`## ${FINAL_NOTICE_HEADING}`, "", ...buildFinalNoticeBody(mode)];
  return lines.join("\n");
}

export function finalizeDocumentContent(rawContent: string, mode: GenerationMode): string {
  const body = validateAndNormalizeDocumentText(stripTrailingSections(rawContent));
  const full = `${body}\n\n${buildFinalNoticeSection(mode)}`;
  return prepareDocumentText(full).text;
}

export function resolveGenerationMode(doc: Document): GenerationMode {
  if (doc.generation_mode === "openai" || doc.generation_mode === "demo") {
    return doc.generation_mode;
  }

  const content = doc.content ?? "";
  if (content.includes(FINAL_NOTICE_HEADING)) {
    if (/KI-gestützt/i.test(content)) return "openai";
    if (/Demo-Modus/i.test(content)) return "demo";
  }

  if (content.includes("KI-gestützt auf Basis der Unternehmensdaten erstellt")) return "openai";
  if (content.includes("im Demo-Modus automatisch")) return "demo";
  if (/Demo-Modus/i.test(content)) return "demo";

  return "demo";
}

export function getGenerationModeLabel(mode: GenerationMode): string {
  return GENERATION_MODE_LABELS[mode];
}
