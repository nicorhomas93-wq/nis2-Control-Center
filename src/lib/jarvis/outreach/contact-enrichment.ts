import { pickBestContactEmail, extractEmailsFromText } from "@/lib/jarvis/outreach/email-extract";

export interface ContactEnrichmentResult {
  contact_email: string | null;
  contact_phone: string | null;
  has_contact_form: boolean;
  linkedin_url: string | null;
}

const PHONE_PATTERN =
  /(?:\+49|0049|0)\s*[\d\s\-/()]{6,18}\d/g;

const CONTACT_FORM_PATTERNS = [
  /<form[^>]*(?:kontakt|contact|anfrage|inquiry)/i,
  /kontaktformular/i,
  /contact-form/i,
  /type=["']submit["'][^>]*(?:kontakt|senden|absenden|submit)/i,
  /wpcf7|contact-form-7|gravityform/i,
];

const LINKEDIN_COMPANY =
  /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/company\/[a-z0-9_-]+/gi;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 8) return null;
  return raw.replace(/\s+/g, " ").trim();
}

function pickBestPhone(matches: string[]): string | null {
  const normalized = matches
    .map(normalizePhone)
    .filter((p): p is string => Boolean(p));
  if (normalized.length === 0) return null;
  const mobile = normalized.find((p) => /\+49|01[567]/.test(p.replace(/\s/g, "")));
  return mobile ?? normalized[0] ?? null;
}

export function enrichContactFromContent(
  html: string,
  textSample: string,
  options: { website?: string | null; companyName?: string | null } = {}
): ContactEnrichmentResult {
  const combined = `${html}\n${textSample}`;
  const emails = extractEmailsFromText(combined);
  const contact_email =
    pickBestContactEmail(combined, {
      website: options.website,
      companyName: options.companyName,
    }) ?? emails[0] ?? null;

  const phoneMatches = combined.match(PHONE_PATTERN) ?? [];
  const contact_phone = pickBestPhone(phoneMatches);

  const has_contact_form = CONTACT_FORM_PATTERNS.some((re) => re.test(html));

  const linkedinMatch = combined.match(LINKEDIN_COMPANY);
  const linkedin_url = linkedinMatch?.[0]?.split("?")[0] ?? null;

  return {
    contact_email,
    contact_phone,
    has_contact_form,
    linkedin_url,
  };
}

export function isLeadContactable(input: {
  contact_email?: string | null;
  contact_phone?: string | null;
  has_contact_form?: boolean;
}): boolean {
  return Boolean(
    input.contact_email?.trim() ||
      input.contact_phone?.trim() ||
      input.has_contact_form
  );
}
