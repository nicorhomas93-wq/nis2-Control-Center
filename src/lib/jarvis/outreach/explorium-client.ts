/**
 * Explorium Business-Datenbank (lizenzierte Firmendaten, kein Scraping).
 * Doku: https://developers.explorium.ai/reference/businesses/fetch_businesses
 */

const EXPLORIUM_API_URL = "https://api.explorium.ai/v1/businesses";

/** LinkedIn-Kategorien, die zu unserer Partner-Zielgruppe passen (Werte via Explorium-Autocomplete verifiziert) */
export const EXPLORIUM_PARTNER_CATEGORIES = [
  "it services and it consulting",
  "information technology & services",
  "computer and network security",
  "it system operations and maintenance",
  "it system training and support",
  "computer networking",
] as const;

export const EXPLORIUM_DEFAULT_COMPANY_SIZES = ["11-50", "51-200", "201-500"] as const;

export interface ExploriumBusiness {
  business_id: string;
  name: string;
  domain?: string | null;
  website?: string | null;
  city_name?: string | null;
  region?: string | null;
  country_name?: string | null;
  business_description?: string | null;
  number_of_employees_range?: string | null;
  linkedin_industry_category?: string | null;
  naics_description?: string | null;
  linkedin_profile?: string | null;
}

export interface ExploriumFetchOptions {
  page?: number;
  pageSize?: number;
  companySizes?: readonly string[];
  categories?: readonly string[];
  regionCodes?: string[];
}

export function isExploriumConfigured(): boolean {
  return Boolean(process.env.EXPLORIUM_API_KEY?.trim());
}

export async function fetchExploriumBusinesses(
  options: ExploriumFetchOptions = {}
): Promise<{ businesses: ExploriumBusiness[]; totalPages: number }> {
  const apiKey = process.env.EXPLORIUM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("EXPLORIUM_API_KEY fehlt in .env.local");
  }

  const pageSize = Math.min(Math.max(options.pageSize ?? 50, 1), 100);
  const filters: Record<string, unknown> = {
    country_code: { values: ["de"] },
    company_size: { values: options.companySizes ?? EXPLORIUM_DEFAULT_COMPANY_SIZES },
    linkedin_category: { values: options.categories ?? EXPLORIUM_PARTNER_CATEGORIES },
    has_website: { value: true },
  };
  if (options.regionCodes?.length) {
    filters.region_country_code = { values: options.regionCodes.map((c) => c.toLowerCase()) };
  }

  const res = await fetch(EXPLORIUM_API_URL, {
    method: "POST",
    headers: { API_KEY: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "full",
      size: pageSize * 10,
      page_size: pageSize,
      page: options.page ?? 1,
      filters,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Explorium-Fehler HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const json = (await res.json()) as { data?: ExploriumBusiness[]; total_pages?: number };
  return {
    businesses: (json.data ?? []).filter((b) => b?.name?.trim()),
    totalPages: json.total_pages ?? 1,
  };
}

/** "11-50" → 30, "10001+" → 10001 */
export function employeeRangeToCount(range: string | null | undefined): number {
  if (!range) return 0;
  const nums = range.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
  return nums[0] ?? 0;
}
