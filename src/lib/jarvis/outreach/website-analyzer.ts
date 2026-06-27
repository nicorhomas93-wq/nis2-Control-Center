import { calculateNis2RelevanceScore } from "@/lib/jarvis/outreach/nis2-relevance-score";

export interface WebsiteSnapshot {
  url: string | null;
  title: string | null;
  description: string | null;
  textSample: string;
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
        fetched: false,
        error: `HTTP ${res.status}`,
      };
    }

    const html = await res.text();
    const title = extractMeta(html, "title") ?? extractTag(html, "title");
    const description =
      extractMeta(html, "description") ?? extractMeta(html, "og:description");
    const textSample = stripHtml(html).slice(0, 4000);

    return { url, title, description, textSample, fetched: true };
  } catch (err) {
    return {
      url,
      title: null,
      description: null,
      textSample: "",
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

export interface LeadAnalysisResult {
  nis2_relevance_score: number;
  nis2_likelihood: "yes" | "no" | "uncertain";
  it_maturity: "low" | "medium" | "high" | "unknown";
  analysis_bullets: string[];
  observation: string;
}

const IT_HIGH = [
  "iso 27001",
  "soc 2",
  "it-sicherheit",
  "security operations",
  "ciso",
  "siem",
  "penetration",
  "managed security",
];

const IT_LOW = [
  "keine dedizierte it",
  "externer dienstleister",
  "homepage veraltet",
  "under construction",
];

export function analyzeLeadFromContext(input: {
  company_name: string;
  industry: string | null;
  employee_count: string | null;
  hints?: string | null;
  website: WebsiteSnapshot;
}): LeadAnalysisResult {
  const websiteText = [
    input.website.title ?? "",
    input.website.description ?? "",
    input.website.textSample,
  ].join(" ");

  const text = websiteText.toLowerCase();
  const extraBullets: string[] = [];

  if (!input.website.fetched) {
    extraBullets.push(
      input.website.error
        ? `Website nicht erreichbar (${input.website.error})`
        : "Keine Website — Einschätzung nur aus Stammdaten"
    );
  } else {
    if (input.website.title) {
      extraBullets.push(`Seitentitel: „${input.website.title.slice(0, 80)}“`);
    }
    if (!text.includes("sicherheit") && !text.includes("security")) {
      extraBullets.push("Keine Security/Compliance-Seite sichtbar");
    }
    if (text.includes("microsoft") || text.includes("365") || text.includes("cloud")) {
      extraBullets.push("Cloud/Microsoft-Bezug erkennbar");
    }
  }

  const nis2 = calculateNis2RelevanceScore({
    company_name: input.company_name,
    industry: input.industry,
    employee_count: input.employee_count,
    website_text: websiteText,
    hints: input.hints,
  });

  let itScore = 0;
  for (const kw of IT_HIGH) {
    if (text.includes(kw)) itScore += 2;
  }
  for (const kw of IT_LOW) {
    if (text.includes(kw)) itScore -= 1;
  }
  if (!input.website.fetched) itScore = 0;

  let it_maturity: LeadAnalysisResult["it_maturity"] = "medium";
  if (itScore >= 3) it_maturity = "high";
  else if (itScore <= 0) it_maturity = "low";
  if (!input.website.fetched && !input.industry?.toLowerCase().includes("it")) {
    it_maturity = "unknown";
  }

  const observation =
    extraBullets[0] ??
    (nis2.score >= 7
      ? "Hohes NIS2-Potenzial — priorisieren"
      : nis2.score <= 3
        ? "Geringes NIS2-Potenzial"
        : "Mittleres Potenzial — genauer prüfen");

  return {
    nis2_relevance_score: nis2.score,
    nis2_likelihood: nis2.nis2_likelihood,
    it_maturity,
    analysis_bullets: [...nis2.breakdown, ...extraBullets].slice(0, 8),
    observation,
  };
}
