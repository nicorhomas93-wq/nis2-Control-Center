import type { SupabaseClient } from "@supabase/supabase-js";
import {
  employeeRangeToCount,
  fetchExploriumBusinesses,
  type ExploriumBusiness,
} from "@/lib/jarvis/outreach/explorium-client";
import { discoverGermanyLeads, type DiscoverGermanyResult } from "@/lib/jarvis/outreach/germany-discover";
import { scoreQualifiedLead } from "@/lib/jarvis/outreach/qualified-lead-scoring";
import type { QualifiedLeadInput } from "@/lib/jarvis/outreach/qualified-lead-types";
import { fetchWebsiteSnapshot } from "@/lib/jarvis/outreach/website-snapshot";
import { enrichContactFromContent } from "@/lib/jarvis/outreach/contact-enrichment";

/** Explorium berechnet Credits pro abgerufener Firma — 2 Seiten à 25 halten einen Lauf bei max. 50 Credits */
const MAX_PAGES_PER_RUN = 2;
const ENRICH_CONCURRENCY = 8;
/** Website-Abrufe pro Lauf begrenzen (je max. 8 s) — hält die Route unter maxDuration */
const MAX_ENRICH_PER_RUN = 24;

/** Begriffe, auf die das Partner-Scoring reagiert — nur übernehmen, wenn sie wirklich auf der Website stehen */
const WEBSITE_SIGNALS = [
  "systemhaus",
  "it-dienstleister",
  "managed service",
  "microsoft 365",
  "m365",
  "cloud",
  "backup",
  "security",
  "it-sicherheit",
  "informationssicherheit",
  "datenschutz",
  "compliance",
  "nis2",
  "iso 27001",
  "beratung",
  "consulting",
  "mittelstand",
  "kmu",
  "b2b",
  "unternehmenskunden",
  "geschäftskunden",
  "firewall",
  "endpoint",
];

/** Explorium liefert englische LinkedIn-Kategorien — auf die deutschen Keywords der Partner-Klassifizierung abbilden */
const INDUSTRY_LABELS: Record<string, string> = {
  "it services and it consulting": "IT-Dienstleister / IT-Service",
  "information technology & services": "IT-Dienstleister / Systemhaus",
  "computer and network security": "IT-Sicherheit / Cybersecurity",
  "it system operations and maintenance": "IT-Service / Managed Services",
  "it system training and support": "IT-Support / IT-Dienstleister",
  "computer networking": "IT-Dienstleister / Netzwerke",
  // NAICS-Beschreibungen (Explorium liefert die LinkedIn-Kategorie nicht im Ergebnis mit)
  "computer systems design and related services": "IT-Dienstleister / IT-Service",
  "custom computer programming services": "IT-Dienstleister / Softwareentwicklung",
  "computer facilities management services": "IT-Service / Managed Services",
  "other computer related services": "IT-Dienstleister / IT-Service",
};

/** "düsseldorf" → "Düsseldorf", "nordrhein-westfalen" → "Nordrhein-Westfalen" */
function titleCase(value: string): string {
  return value.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Website-Parser greift auf manchen Seiten Zahlenfolgen ab ("00000026", "0 0 100 100") — nur echte DE-Nummern übernehmen */
function plausibleGermanPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  const national = /^(\+|00)49/.test(trimmed) ? `0${digits.replace(/^(00)?49/, "")}` : digits;
  // Vorwahl 0[1-9], 9–15 Stellen (filtert Bereiche wie "0168-0169" und Daten), keine Ziffernketten wie 000000
  if (!/^0[1-9]\d{7,13}$/.test(national) || /(\d)\1{5,}/.test(national)) return undefined;
  return trimmed;
}

function plausibleEmail(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  return /@(example|test|domain|email)\.(com|de|org)$/i.test(email) ? undefined : email;
}

function toQualifiedLead(b: ExploriumBusiness): QualifiedLeadInput {
  const category = (b.linkedin_industry_category ?? b.naics_description ?? "").trim().toLowerCase();
  const website = b.website?.trim() || (b.domain ? `https://${b.domain}` : undefined);
  const city = b.city_name?.trim() || b.region?.trim();
  return {
    company_name: b.name.trim(),
    city: city ? titleCase(city) : "Deutschland",
    industry: INDUSTRY_LABELS[category] ?? b.naics_description ?? "IT-Dienstleister",
    employee_count: employeeRangeToCount(b.number_of_employees_range),
    website,
    linkedin_url: b.linkedin_profile?.trim() || undefined,
    // Explorium filtert auf country_code "de" — Standort ist damit belegt
    hints: [b.business_description?.slice(0, 400), "Standort Deutschland", `Quelle: Explorium (${b.business_id})`]
      .filter(Boolean)
      .join(" — "),
  };
}

/** Website abrufen: Kontaktdaten + tatsächlich vorhandene Leistungs-Signale für das Scoring */
async function enrichFromWebsite(leads: QualifiedLeadInput[]): Promise<QualifiedLeadInput[]> {
  const result: QualifiedLeadInput[] = [];
  for (let i = 0; i < leads.length; i += ENRICH_CONCURRENCY) {
    const batch = leads.slice(i, i + ENRICH_CONCURRENCY);
    const enriched = await Promise.all(
      batch.map(async (lead) => {
        const snap = await fetchWebsiteSnapshot(lead.website);
        if (!snap.fetched) return lead;
        const contact = enrichContactFromContent(snap.htmlSample, snap.textSample, {
          website: lead.website,
          companyName: lead.company_name,
        });
        const siteText = `${snap.title ?? ""} ${snap.description ?? ""} ${snap.textSample}`.toLowerCase();
        const signals = WEBSITE_SIGNALS.filter((kw) => siteText.includes(kw));
        return {
          ...lead,
          contact_email: lead.contact_email ?? plausibleEmail(contact.contact_email),
          contact_phone: lead.contact_phone ?? plausibleGermanPhone(contact.contact_phone),
          has_contact_form: lead.has_contact_form || contact.has_contact_form,
          linkedin_url: lead.linkedin_url ?? contact.linkedin_url ?? undefined,
          hints: signals.length ? `${lead.hints} — Website: ${signals.join(", ")}` : lead.hints,
        };
      })
    );
    result.push(...enriched);
  }
  return result;
}

export interface DiscoverExploriumResult extends DiscoverGermanyResult {
  fetched: number;
}

/**
 * Neue Partner-Leads aus der Explorium-Firmendatenbank: DE, IT-Dienstleister/Security, 11–500 MA.
 * Bestehende Firmen werden übersprungen, Kontaktdaten von der Firmen-Website ergänzt.
 */
export async function discoverExploriumLeads(
  supabase: SupabaseClient,
  options: { limit: number; previewOnly?: boolean; regionCodes?: string[] }
): Promise<DiscoverExploriumResult> {
  const { data: existing } = await supabase.from("b2b_outreach_leads").select("company_name");
  const known = new Set(
    (existing ?? []).map((r) => r.company_name?.trim().toLowerCase()).filter(Boolean)
  );

  // Mehr Kandidaten als nötig holen — ein Teil fällt beim Scoring bzw. mangels Kontaktweg raus
  const target = MAX_ENRICH_PER_RUN;
  const candidates: QualifiedLeadInput[] = [];
  let fetched = 0;

  for (let page = 1; page <= MAX_PAGES_PER_RUN && candidates.length < target; page++) {
    const { businesses, totalPages } = await fetchExploriumBusinesses({
      page,
      regionCodes: options.regionCodes,
    });
    fetched += businesses.length;

    const fresh = businesses
      .map(toQualifiedLead)
      .filter((lead) => {
        const key = lead.company_name.toLowerCase();
        if (known.has(key)) return false;
        known.add(key);
        return true;
      });
    // Klar fachfremde Firmen (Behörden, Kliniken, Konzerne …) schon vor dem Website-Abruf aussortieren
    candidates.push(...fresh.filter((lead) => !scoreQualifiedLead(lead).deprioritized));

    if (page >= totalPages) break;
  }

  // Scoring erst nach dem Website-Abruf — dann zählen die echten Leistungs-Signale
  const pool = await enrichFromWebsite(candidates.slice(0, target));

  const result = await discoverGermanyLeads(supabase, {
    pool,
    limit: options.limit,
    previewOnly: options.previewOnly,
    source: "explorium",
    scoreLabel: "Explorium-Score",
  });

  return { ...result, fetched };
}
