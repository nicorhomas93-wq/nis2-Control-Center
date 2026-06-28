const LEGAL_SUFFIXES = [
  "gmbh & co. kg",
  "gmbh & co kg",
  "gmbh und co. kg",
  "gmbh und co kg",
  "gesellschaft mit beschränkter haftung",
  "gmbh",
  "ag",
  "ug (haftungsbeschränkt)",
  "ug haftungsbeschränkt",
  "ug",
  "kg",
  "ohg",
  "gbr",
  "e.k.",
  "e. k.",
  "ek",
  "se",
  "kgaa",
  "mbh",
];

const GENERIC_SUFFIXES = [
  "holding",
  "verwaltung",
  "gruppe",
  "beteiligung",
  "beteiligungs",
  "energieversorgung",
  "services",
  "service",
  "consulting",
  "deutschland",
  "germany",
  "international",
  "group",
  "management",
];

const PLURAL_VARIANTS: [string, string][] = [
  ["netz", "netze"],
  ["energie", "energien"],
  ["versorgung", "versorgungs"],
  ["stadtwerk", "stadtwerke"],
  ["werk", "werke"],
  ["netzwerk", "netzwerke"],
  ["service", "services"],
];

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function stripLegalForms(name: string): string {
  let result = name.trim();
  const lower = result.toLowerCase();
  for (const suffix of LEGAL_SUFFIXES.sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`[\\s,–-]*${escapeRegex(suffix)}\\s*$`, "i");
    if (re.test(lower)) {
      result = normalizeWhitespace(result.replace(re, ""));
      break;
    }
  }
  return normalizeWhitespace(result);
}

function stripGenericSuffixes(name: string): string {
  let result = name;
  for (const suffix of GENERIC_SUFFIXES) {
    const re = new RegExp(`\\b${escapeRegex(suffix)}\\b`, "gi");
    result = normalizeWhitespace(result.replace(re, ""));
  }
  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compact(name: string): string {
  return slugify(name).replace(/-/g, "");
}

function addPluralVariants(names: Set<string>, base: string): void {
  const lower = base.toLowerCase();
  for (const [singular, plural] of PLURAL_VARIANTS) {
    if (lower.includes(singular)) {
      names.add(lower.replace(singular, plural));
    }
    if (lower.includes(plural)) {
      names.add(lower.replace(plural, singular));
    }
  }
}

export interface CompanyNameVariants {
  original: string;
  /** Alle Varianten für Matching (kleingeschrieben, dedupliziert) */
  searchTerms: string[];
  /** Kompakte Slugs für Domain-Probing */
  domainSlugs: string[];
}

/**
 * Erzeugt Such- und Domain-Varianten aus einem Firmennamen.
 * Keine harten Annahmen — nur Normalisierung für Fuzzy-Matching.
 */
export function generateCompanyNameVariants(companyName: string): CompanyNameVariants {
  const original = normalizeWhitespace(companyName);
  const terms = new Set<string>();
  const slugs = new Set<string>();

  const add = (value: string) => {
    const v = normalizeWhitespace(value);
    if (v.length >= 2) {
      terms.add(v.toLowerCase());
      const s = slugify(v);
      if (s.length >= 2) slugs.add(s);
      const c = compact(v);
      if (c.length >= 2) slugs.add(c);
    }
  };

  add(original);

  const withoutLegal = stripLegalForms(original);
  if (withoutLegal !== original) add(withoutLegal);

  const coreName = stripGenericSuffixes(withoutLegal);
  if (coreName && coreName !== withoutLegal) add(coreName);

  const combined = stripGenericSuffixes(stripLegalForms(original));
  if (combined) add(combined);

  for (const term of [...terms]) {
    addPluralVariants(terms, term);
    const words = term.split(/\s+/);
    if (words.length > 1) {
      add(words.join(""));
      add(words.slice(0, 2).join(" "));
      add(words[0] ?? term);
    }
  }

  terms.add(original.toLowerCase());

  return {
    original,
    searchTerms: [...terms].filter((t) => t.length >= 2),
    domainSlugs: [...slugs].filter((s) => s.length >= 3).slice(0, 12),
  };
}

/** Prüft, ob ein Text einen Firmennamen (oder Variante) enthält. */
export function nameAppearsInText(text: string, variants: CompanyNameVariants): {
  matched: boolean;
  matchedName?: string;
  score: number;
} {
  const haystack = text.toLowerCase();
  let bestScore = 0;
  let matchedName: string | undefined;

  for (const term of variants.searchTerms) {
    if (term.length < 3) continue;
    if (haystack.includes(term)) {
      const score = term.length >= 8 ? 3 : term.length >= 5 ? 2 : 1;
      if (score > bestScore) {
        bestScore = score;
        matchedName = term;
      }
    }
  }

  const compactHay = haystack.replace(/[^a-z0-9äöüß]/g, "");
  for (const slug of variants.domainSlugs) {
    if (slug.length >= 4 && compactHay.includes(slug.replace(/-/g, ""))) {
      if (3 > bestScore) {
        bestScore = 3;
        matchedName = slug;
      }
    }
  }

  return { matched: bestScore > 0, matchedName, score: bestScore };
}
