import { validateAndNormalizeDocumentText } from "@/lib/documents/text-normalize";

/**
 * Bereitet Markdown vor dem PDF-/Export-Rendering auf.
 */
export function normalizeMarkdownForPdf(content: string): string {
  let text = validateAndNormalizeDocumentText(content.replace(/\r\n/g, "\n"));

  text = normalizeListLines(text);
  text = fixOrphanListMarkers(text);

  // Bullet-Zeichen vereinheitlichen
  text = text.replace(/^(\d+)·\s*/gm, "$1. ");
  text = text.replace(/^[·•]\s+/gm, "- ");
  text = text.replace(/^\*\s+(?!\*)/gm, "- ");

  // Gemischte Listenzeilen bereinigen (z. B. "5· Punkt")
  text = text.replace(/^(\d+)\s*·\s*/gm, "- ");
  text = text.replace(/^(\d+)\.\s*·\s*/gm, "$1. ");

  // Verwaiste Markdown-Zeilen entfernen
  text = text.replace(/^[`"'*·•]+$/gm, "");
  text = text.replace(/^(\d+)\.\s*$/gm, "");

  text = joinBrokenParagraphLines(text);

  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");

  return text.trim();
}

function normalizeListLines(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (/^[-*·•]\s*$/.test(trimmed)) return "";
      if (/^`+$/.test(trimmed)) return "";
      return line;
    })
    .join("\n");
}

function fixOrphanListMarkers(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (/^(\d+)\.\s*$/.test(trimmed) && i + 1 < lines.length && lines[i + 1].trim()) {
      result.push(`${trimmed} ${lines[++i].trim()}`);
      continue;
    }

    if (/^[·•\-*]\s*$/.test(trimmed) && i + 1 < lines.length && lines[i + 1].trim()) {
      result.push(`- ${lines[++i].trim()}`);
      continue;
    }

    result.push(lines[i]);
  }

  return result.join("\n");
}

function joinBrokenParagraphLines(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      result.push("");
      continue;
    }

    if (isStructuralLine(trimmed)) {
      result.push(trimmed);
      continue;
    }

    const prev = result.length > 0 ? result[result.length - 1] : "";
    const prevTrimmed = prev.trim();

    if (
      prevTrimmed &&
      !isStructuralLine(prevTrimmed) &&
      shouldJoinLines(prevTrimmed, trimmed)
    ) {
      result[result.length - 1] = `${prevTrimmed} ${trimmed}`;
    } else {
      result.push(trimmed);
    }
  }

  return result.join("\n");
}

function isStructuralLine(line: string): boolean {
  return (
    line.startsWith("#") ||
    /^[-*·•]\s+/.test(line) ||
    /^\d+[\.\·]\s*/.test(line) ||
    line.includes("|") ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(line)
  );
}

function shouldJoinLines(prev: string, next: string): boolean {
  if (/[.!?:;]$/.test(prev)) return false;
  if (/^[A-ZÄÖÜ„"']/.test(next) && /[.!?]$/.test(prev)) return false;
  if (/^\d+[\.\·]\s*/.test(next)) return false;
  if (/^[-*·•]\s+/.test(next)) return false;
  return /^[a-zäöüß0-9,(]/.test(next);
}

export function cleanInlineMarkdown(text: string): string {
  let result = validateAndNormalizeDocumentText(text);

  result = result.replace(/`([^`]+)`/g, "$1");
  result = result.replace(/`/g, "");
  result = result.replace(/\*\*(.+?)\*\*/g, "$1");
  result = result.replace(/\*(.+?)\*/g, "$1");
  result = result.replace(/^[*\-·•"']+\s*/g, "");
  result = result.replace(/\s*[*\-·•"']+$/g, "");
  result = result.replace(/(\d+)·/g, "$1.");
  result = result.replace(/\s{2,}/g, " ");

  return result.trim();
}

export { validateAndNormalizeDocumentText };
