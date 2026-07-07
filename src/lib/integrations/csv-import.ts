import type { CsvImportType } from "@/lib/integrations/types";

function parseLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

export function parseCsvFlexible(text: string): Record<string, string>[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!rows.length) return [];

  const commaCount = (rows[0].match(/,/g) ?? []).length;
  const semicolonCount = (rows[0].match(/;/g) ?? []).length;
  const delimiter = semicolonCount > commaCount ? ";" : ",";

  const headers = parseLine(rows[0], delimiter).map((h) => h.replace(/^"|"$/g, "").trim());
  return rows.slice(1).map((line) => {
    const values = parseLine(line, delimiter);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] ?? "").replace(/^"|"$/g, "").trim();
    });
    return obj;
  });
}

export function requiredFieldsForImport(type: CsvImportType): string[] {
  switch (type) {
    case "suppliers":
      return ["name"];
    case "assets":
      return ["name", "category"];
    case "risks":
      return ["asset", "threat", "risk_level"];
    case "measures":
      return ["title"];
    case "evidence":
      return ["title"];
    case "users":
      return ["email"];
    case "departments":
      return ["name"];
    default:
      return [];
  }
}
