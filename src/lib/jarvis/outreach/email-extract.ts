const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const IGNORED_LOCALS = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "mailer-daemon",
  "postmaster",
  "abuse",
  "newsletter",
  "unsubscribe",
  "datenschutz",
  "privacy",
  "jobs",
  "karriere",
  "bewerbung",
  "hr",
]);

const PREFERRED_LOCALS = [
  "info",
  "kontakt",
  "contact",
  "hello",
  "sales",
  "partner",
  "service",
  "office",
  "mail",
];

const GENERIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "gmx.de",
  "gmx.net",
  "web.de",
  "t-online.de",
  "outlook.com",
  "hotmail.com",
  "yahoo.de",
  "icloud.com",
]);

function domainFromWebsite(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const url = website.trim().match(/^https?:\/\//i)
      ? website.trim()
      : `https://${website.trim()}`;
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function scoreEmail(email: string, companyDomain: string | null): number {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain) return -100;
  if (IGNORED_LOCALS.has(local)) return -50;
  if (GENERIC_DOMAINS.has(domain)) return -20;

  let score = 0;
  const preferredIdx = PREFERRED_LOCALS.indexOf(local);
  if (preferredIdx >= 0) score += 30 - preferredIdx;

  if (companyDomain && (domain === companyDomain || domain.endsWith(`.${companyDomain}`))) {
    score += 40;
  }

  if (local.includes("info") || local.includes("kontakt")) score += 10;
  return score;
}

export function extractEmailsFromText(text: string): string[] {
  if (!text?.trim()) return [];
  const raw = text.match(EMAIL_PATTERN) ?? [];
  return [...new Set(raw.map((e) => e.toLowerCase().replace(/[.,;]+$/, "")))];
}

export function pickBestContactEmail(
  text: string,
  options: { website?: string | null; companyName?: string | null } = {}
): string | null {
  const candidates = extractEmailsFromText(text);
  if (candidates.length === 0) return null;

  const companyDomain = domainFromWebsite(options.website);
  const ranked = candidates
    .map((email) => ({ email, score: scoreEmail(email, companyDomain) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.email ?? null;
}
