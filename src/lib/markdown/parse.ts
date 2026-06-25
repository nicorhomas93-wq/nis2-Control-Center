export type MarkdownBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "hr" }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

function parseTableCells(row: string): string[] {
  const parts = row.split("|").map((c) => c.trim());
  if (parts[0] === "") parts.shift();
  if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim());
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.includes("|") && t.split("|").filter((c) => c.trim()).length >= 2;
}

function sectionPrefersOrderedList(heading: string): boolean {
  const h = heading.toLowerCase();
  return /prozess|vorgehen|ablauf|schritte/.test(h);
}

function sectionPrefersBulletList(heading: string): boolean {
  const h = heading.toLowerCase();
  return /nachweis|offene punkte|dokumentationspflicht/.test(h);
}

/** Erzwingt einheitliche Listen je Abschnitt (nummeriert vs. Bullet). */
function enforceListTypesBySection(blocks: MarkdownBlock[]): MarkdownBlock[] {
  let currentSection = "";
  const result: MarkdownBlock[] = [];

  for (const block of blocks) {
    if (block.type === "h2" || block.type === "h3") {
      currentSection = block.text;
      result.push(block);
      continue;
    }

    if (block.type === "ol" && sectionPrefersBulletList(currentSection)) {
      result.push({ type: "ul", items: [...block.items] });
      continue;
    }

    if (block.type === "ul" && sectionPrefersOrderedList(currentSection)) {
      result.push({ type: "ol", items: [...block.items] });
      continue;
    }

    result.push(block);
  }

  return result;
}

/** Fasst aufeinanderfolgende Listen und nummerierte Absätze zusammen. */
export function postProcessMarkdownBlocks(blocks: MarkdownBlock[]): MarkdownBlock[] {
  const merged: MarkdownBlock[] = [];

  for (const block of blocks) {
    if (block.type === "ol") {
      const last = merged[merged.length - 1];
      if (last?.type === "ol") {
        last.items.push(...block.items);
        continue;
      }
      merged.push({ ...block, items: [...block.items] });
      continue;
    }

    if (block.type === "ul") {
      const last = merged[merged.length - 1];
      if (last?.type === "ul") {
        last.items.push(...block.items);
        continue;
      }
      merged.push({ ...block, items: [...block.items] });
      continue;
    }

    if (block.type === "paragraph") {
      const numbered = block.text.match(/^\d+[\.\·]\s+/);
      if (numbered) {
        const item = block.text.replace(/^\d+[\.\·]\s+/, "").trim();
        const last = merged[merged.length - 1];
        if (last?.type === "ol") {
          last.items.push(item);
          continue;
        }
        merged.push({ type: "ol", items: [item] });
        continue;
      }

      const bulleted = block.text.match(/^[-*·•]\s+/);
      if (bulleted) {
        const item = block.text.replace(/^[-*·•]\s+/, "").trim();
        const last = merged[merged.length - 1];
        if (last?.type === "ul") {
          last.items.push(item);
          continue;
        }
        merged.push({ type: "ul", items: [item] });
        continue;
      }

      const dotNumbered = block.text.match(/^(\d+)·\s+/);
      if (dotNumbered) {
        const item = block.text.replace(/^\d+·\s+/, "").trim();
        const last = merged[merged.length - 1];
        if (last?.type === "ul") {
          last.items.push(item);
          continue;
        }
        merged.push({ type: "ul", items: [item] });
        continue;
      }

      const inlineNumbered = splitInlineNumberedList(block.text);
      if (inlineNumbered) {
        merged.push({ type: "ol", items: inlineNumbered });
        continue;
      }
    }

    merged.push(block);
  }

  return enforceListTypesBySection(merged);
}

function splitInlineNumberedList(text: string): string[] | null {
  const parts = text.split(/(?=\s*\d+\.\s+)/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  if (!parts.every((p) => /^\d+\.\s+/.test(p))) return null;
  return parts.map((p) => p.replace(/^\d+\.\s+/, "").trim());
}

export function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: trimmed.slice(2) });
      i++;
      continue;
    }

    if (
      isTableRow(lines[i]) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = parseTableCells(tableLines[0]);
      const rows = tableLines.slice(2).map(parseTableCells);
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (/^[-*·•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*·•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*·•]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+[\.\·]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\·]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[\.\·]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) break;
      if (t.startsWith("#") || /^(-{3,}|\*{3,}|_{3,})$/.test(t)) break;
      if (/^[-*·•]\s+/.test(t) || /^\d+[\.\·]\s+/.test(t)) break;
      if (isTableRow(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) break;
      paraLines.push(t);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return postProcessMarkdownBlocks(blocks);
}
