import type { SupabaseClient } from "@supabase/supabase-js";
import { SEED_LEADS } from "@/lib/jarvis/outreach/constants";
import { calculateNis2RelevanceScore } from "@/lib/jarvis/outreach/nis2-relevance-score";

export interface ImportLeadInput {
  company_name: string;
  industry?: string | null;
  website?: string | null;
  employee_count?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  contact_email?: string | null;
  hints?: string | null;
  source?: string;
}

export function parseCsvLeads(csv: string): ImportLeadInput[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) =>
    names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;

  const map = {
    company: idx(["firma", "company", "company_name", "unternehmen"]),
    industry: idx(["branche", "industry"]),
    website: idx(["website", "web", "url"]),
    employees: idx(["mitarbeiter", "employee_count", "ma"]),
    contact: idx(["ansprechpartner", "contact_name", "name"]),
    role: idx(["rolle", "role", "position", "contact_role"]),
    email: idx(["email", "e-mail", "contact_email"]),
    hints: idx(["hinweise", "hints", "notizen", "notes"]),
  };

  const leads: ImportLeadInput[] = [];

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const company_name = cols[map.company]?.trim();
    if (!company_name) continue;

    leads.push({
      company_name,
      industry: cols[map.industry]?.trim() || null,
      website: cols[map.website]?.trim() || null,
      employee_count: cols[map.employees]?.trim() || null,
      contact_name: cols[map.contact]?.trim() || null,
      contact_role: cols[map.role]?.trim() || null,
      contact_email: cols[map.email]?.trim() || null,
      hints: cols[map.hints]?.trim() || null,
      source: "csv",
    });
  }

  return leads;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
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
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function importLeads(
  supabase: SupabaseClient,
  leads: ImportLeadInput[]
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const result = { inserted: 0, skipped: 0, errors: [] as string[] };

  const { data: existing } = await supabase
    .from("b2b_outreach_leads")
    .select("company_name");

  const names = new Set(
    (existing ?? []).map((r) => r.company_name?.trim().toLowerCase()).filter(Boolean)
  );

  for (const lead of leads) {
    const key = lead.company_name.trim().toLowerCase();
    if (names.has(key)) {
      result.skipped += 1;
      continue;
    }

    const scored = calculateNis2RelevanceScore({
      company_name: lead.company_name,
      industry: lead.industry,
      employee_count: lead.employee_count,
      hints: lead.hints,
    });

    const { error } = await supabase.from("b2b_outreach_leads").insert({
      company_name: lead.company_name.trim(),
      industry: lead.industry?.trim() || null,
      website: lead.website?.trim() || null,
      employee_count: lead.employee_count?.trim() || null,
      contact_name: lead.contact_name?.trim() || null,
      contact_role: lead.contact_role?.trim() || null,
      contact_email: lead.contact_email?.trim() || null,
      hints: lead.hints?.trim() || null,
      source: lead.source ?? "manual",
      status: "new",
      nis2_relevance_score: scored.score,
      nis2_likelihood: scored.nis2_likelihood,
      analysis_bullets: scored.breakdown,
    });

    if (error) {
      result.errors.push(`${lead.company_name}: ${error.message}`);
    } else {
      names.add(key);
      result.inserted += 1;
    }
  }

  return result;
}

export async function discoverSeedLeads(
  supabase: SupabaseClient,
  count: number
): Promise<{ inserted: number; skipped: number }> {
  const shuffled = [...SEED_LEADS].sort(() => Math.random() - 0.5);
  const batch = shuffled.slice(0, Math.min(count, shuffled.length)).map((s) => ({
    ...s,
    source: "discover",
  }));
  const { inserted, skipped } = await importLeads(supabase, batch);
  return { inserted, skipped };
}
