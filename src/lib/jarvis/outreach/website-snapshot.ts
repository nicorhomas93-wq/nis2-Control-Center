export interface WebsiteSnapshot {
  url: string | null;
  title: string | null;
  description: string | null;
  textSample: string;
  htmlSample: string;
  fetched: boolean;
  error?: string;
}

export async function fetchWebsiteSnapshot(
  website: string | null | undefined
): Promise<WebsiteSnapshot> {
  if (!website?.trim()) {
    return {
      url: null,
      title: null,
      description: null,
      textSample: "",
      htmlSample: "",
      fetched: false,
      error: "Keine Website hinterlegt",
    };
  }

  let url = website.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TKND-Outreach-Bot/1.0 (+https://tknd.de)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        url,
        title: null,
        description: null,
        textSample: "",
        htmlSample: "",
        fetched: false,
        error: `HTTP ${res.status}`,
      };
    }

    const html = await res.text();
    const title = extractMeta(html, "title") ?? extractTag(html, "title");
    const description =
      extractMeta(html, "description") ?? extractMeta(html, "og:description");
    const textSample = stripHtml(html).slice(0, 4000);

    return { url, title, description, textSample, htmlSample: html.slice(0, 30000), fetched: true };
  } catch (err) {
    return {
      url,
      title: null,
      description: null,
      textSample: "",
      htmlSample: "",
      fetched: false,
      error: err instanceof Error ? err.message : "Fetch fehlgeschlagen",
    };
  }
}

function extractTag(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function extractMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
