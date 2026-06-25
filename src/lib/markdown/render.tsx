import type { MarkdownBlock } from "@/lib/markdown/parse";
import { parseMarkdown } from "@/lib/markdown/parse";
import { cleanInlineMarkdown, normalizeMarkdownForPdf } from "@/lib/markdown/normalize";
import { FINAL_NOTICE_HEADING } from "@/lib/documents/generation-mode";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatInlineMarkdown(text: string): string {
  const cleaned = cleanInlineMarkdown(text);
  return escapeHtml(cleaned)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function blockToHtml(block: MarkdownBlock): string {
  switch (block.type) {
    case "h1":
      return `<h1>${formatInlineMarkdown(block.text)}</h1>`;
    case "h2":
      return `<h2>${formatInlineMarkdown(block.text)}</h2>`;
    case "h3":
      return `<h3>${formatInlineMarkdown(block.text)}</h3>`;
    case "hr":
      return "<hr />";
    case "paragraph":
      return `<p>${formatInlineMarkdown(block.text)}</p>`;
    case "ul":
      return `<ul class="doc-bullet-list">${block.items
        .map((item) => `<li>${formatInlineMarkdown(item)}</li>`)
        .join("")}</ul>`;
    case "ol":
      return `<ol class="doc-numbered-list">${block.items
        .map((item) => `<li>${formatInlineMarkdown(item)}</li>`)
        .join("")}</ol>`;
    case "table":
      return `<table><thead><tr>${block.headers
        .map((h) => `<th>${formatInlineMarkdown(h)}</th>`)
        .join("")}</tr></thead><tbody>${block.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${formatInlineMarkdown(cell)}</td>`).join("")}</tr>`
        )
        .join("")}</tbody></table>`;
  }
}

function wrapPdfBlock(html: string, wrapBlocks: boolean, compact = false): string {
  if (!wrapBlocks) return html;
  const compactClass = compact ? " pdf-block-compact" : "";
  return `<div class="pdf-block${compactClass}">${html}</div>`;
}

function isFinalNoticeBlock(block: MarkdownBlock): boolean {
  return block.type === "h2" && block.text.includes(FINAL_NOTICE_HEADING);
}

/** Gruppiert den finalen Hinweis mit dem vorherigen Abschnitt für bessere Seitenumbrüche. */
export function groupBlocksForPdf(blocks: MarkdownBlock[]): MarkdownBlock[][] {
  if (blocks.length === 0) return [];

  const finalIdx = blocks.findIndex(isFinalNoticeBlock);
  if (finalIdx <= 0) {
    return blocks.map((block) => [block]);
  }

  let prevH2Idx = finalIdx - 1;
  while (prevH2Idx > 0 && blocks[prevH2Idx].type !== "h2") {
    prevH2Idx--;
  }

  if (blocks[prevH2Idx].type !== "h2") {
    return blocks.map((block) => [block]);
  }

  const groups: MarkdownBlock[][] = [];
  for (let i = 0; i < prevH2Idx; i++) {
    groups.push([blocks[i]]);
  }
  groups.push(blocks.slice(prevH2Idx));
  return groups;
}

export function markdownBlocksToHtml(
  blocks: MarkdownBlock[],
  options?: { wrapBlocks?: boolean }
): string {
  const wrapBlocks = options?.wrapBlocks ?? false;

  if (wrapBlocks) {
    const groups = groupBlocksForPdf(blocks);
    return groups
      .map((group) =>
        wrapPdfBlock(
          group.map((block) => blockToHtml(block)).join(""),
          true,
          group.length > 1 && group.some(isFinalNoticeBlock)
        )
      )
      .join("\n");
  }

  return blocks.map((block) => blockToHtml(block)).join("\n");
}

export function markdownToHtml(content: string): string {
  return markdownBlocksToHtml(parseMarkdown(content));
}

export function markdownToPdfHtml(content: string): string {
  const normalized = normalizeMarkdownForPdf(content);
  return markdownBlocksToHtml(parseMarkdown(normalized), { wrapBlocks: true });
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const blocks = parseMarkdown(content);

  return (
    <article className={className ?? "document-markdown"}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h1":
            return (
              <h1 key={i} className="doc-h1">
                {cleanInlineMarkdown(block.text)}
              </h1>
            );
          case "h2":
            return (
              <h2 key={i} className="doc-h2">
                {cleanInlineMarkdown(block.text)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="doc-h3">
                {cleanInlineMarkdown(block.text)}
              </h3>
            );
          case "hr":
            return <hr key={i} className="doc-hr" />;
          case "paragraph":
            return (
              <p key={i} className="doc-p">
                {cleanInlineMarkdown(block.text)}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="doc-ul doc-bullet-list">
                {block.items.map((item, j) => (
                  <li key={j}>{cleanInlineMarkdown(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="doc-ol doc-numbered-list">
                {block.items.map((item, j) => (
                  <li key={j}>{cleanInlineMarkdown(item)}</li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div key={i} className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      {block.headers.map((h, j) => (
                        <th key={j}>{cleanInlineMarkdown(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{cleanInlineMarkdown(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </article>
  );
}
