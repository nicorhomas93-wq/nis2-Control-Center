export function stripDuplicateDocumentTitle(content: string, title: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  if (lines.length === 0) return content;

  const first = lines[0].trim();
  if (first.startsWith("# ")) {
    const heading = first.slice(2).trim();
    const normalizedTitle = title.trim().toLowerCase();
    if (
      heading.toLowerCase() === normalizedTitle ||
      heading.replace(/^NIS2[\s_-]+/i, "").toLowerCase() ===
        normalizedTitle.replace(/^NIS2[\s_-]+/i, "").toLowerCase()
    ) {
      return lines.slice(1).join("\n").replace(/^\n+/, "");
    }
  }

  return content;
}
