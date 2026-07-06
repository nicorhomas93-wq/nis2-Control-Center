const DEFAULT_USER_AGENT =
  "TKND-Jarvis-LeadResearch/1.0 (+https://tknd-unity-gbr.de; compliance research)";

export interface FetchHtmlOptions {
  timeoutMs?: number;
  accept?: string;
  headers?: Record<string, string>;
}

export async function fetchText(
  url: string,
  options: FetchHtmlOptions = {}
): Promise<{ ok: boolean; status: number; text: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: options.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "de-DE,de;q=0.9",
      ...options.headers,
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
    redirect: "follow",
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&uuml;/gi, "ü")
    .replace(/&ouml;/gi, "ö")
    .replace(/&auml;/gi, "ä")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Auml;/g, "Ä")
    .replace(/&szlig;/gi, "ß")
    .replace(/&nbsp;/g, " ");
}

export function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
