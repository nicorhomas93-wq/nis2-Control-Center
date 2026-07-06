import { decodeHtmlEntities, stripHtml } from "@/lib/jarvis/lead-research/scrapers/http";

export interface RssItem {
  title: string;
  link: string;
  description: string;
  guid: string;
  pubDate: string | null;
}

function readTag(block: string, tag: string): string {
  const cdata = block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata) return cdata[1].trim();

  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plain ? plain[1].trim() : "";
}

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const title = decodeHtmlEntities(stripHtml(readTag(block, "title")));
    const link = readTag(block, "link").trim();
    const description = stripHtml(readTag(block, "description"));
    const guid = readTag(block, "guid").trim() || link;
    const pubDate = readTag(block, "pubDate").trim() || null;

    if (!title || !link) continue;
    items.push({ title, link, description, guid, pubDate });
  }

  return items;
}
