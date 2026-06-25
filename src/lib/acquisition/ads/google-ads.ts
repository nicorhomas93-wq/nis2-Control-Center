export type GoogleCampaignType = "search_intent" | "display_retargeting";

export interface GoogleSearchKeyword {
  keyword: string;
  matchType: "exact" | "phrase" | "broad";
  intent: "high" | "medium";
}

export interface GoogleAdCopy {
  headlines: string[];
  descriptions: string[];
  cta: string;
  finalUrl: string;
  path1?: string;
  path2?: string;
}

export interface GoogleCampaign {
  id: string;
  name: string;
  type: GoogleCampaignType;
  objective: "leads" | "conversions";
  budgetHint: string;
  keywords?: GoogleSearchKeyword[];
  negativeKeywords?: string[];
  adCopy: GoogleAdCopy;
  retargetingMessages?: string[];
  utmCampaign: string;
}

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://nis2-control-center.vercel.app";

export const GOOGLE_SEARCH_HEADLINES = [
  "Sind Sie NIS2 betroffen?",
  "NIS2 Pflicht für Ihr Unternehmen?",
  "Jetzt NIS2 Status prüfen",
  "NIS2 Pflicht oder Risiko?",
  "72 Stunden Meldefrist beachten",
  "Ist Ihr Unternehmen betroffen?",
  "NIS2 Prüfung für KMU",
  "Ohne Nachweis droht Risiko",
  "NIS2 Dokumentation fehlt?",
  "Jetzt NIS2 Check starten",
] as const;

export const GOOGLE_SEARCH_DESCRIPTIONS = [
  "Prüfen Sie in wenigen Minuten, ob Ihr Unternehmen NIS2-pflichtig ist.",
  "Viele Unternehmen sind betroffen, wissen es aber nicht. Jetzt klären.",
  "Erhalten Sie sofort Ihr Ergebnis und konkrete Handlungsschritte.",
  "Ohne Struktur fehlt der Nachweis. Jetzt kostenlos prüfen.",
] as const;

export const GOOGLE_SEARCH_KEYWORDS: GoogleSearchKeyword[] = [
  { keyword: "NIS2 Pflicht prüfen", matchType: "phrase", intent: "high" },
  { keyword: "bin ich NIS2 betroffen", matchType: "phrase", intent: "high" },
  { keyword: "NIS2 KMU Deutschland", matchType: "phrase", intent: "high" },
  { keyword: "NIS2 Anforderungen Unternehmen", matchType: "phrase", intent: "high" },
  { keyword: "NIS2 Dokumentation Pflicht", matchType: "phrase", intent: "high" },
  { keyword: "NIS2 Betroffenheit prüfen", matchType: "phrase", intent: "high" },
  { keyword: "NIS2 Meldepflicht Unternehmen", matchType: "phrase", intent: "medium" },
  { keyword: "NIS2 Compliance KMU", matchType: "phrase", intent: "medium" },
];

export const GOOGLE_NEGATIVE_KEYWORDS = [
  "jobs",
  "stellenangebot",
  "ausbildung",
  "studium",
  "pdf kostenlos",
  "gesetz text",
  "wikipedia",
  "was ist nis2",
  "definition",
];

export const GOOGLE_CAMPAIGNS: GoogleCampaign[] = [
  {
    id: "google_search_intent",
    name: "Search — High Intent NIS2 Check",
    type: "search_intent",
    objective: "leads",
    budgetHint: "70% Gesamt-Budget · CPC-Ziel: Lead (Check-Abschluss)",
    keywords: GOOGLE_SEARCH_KEYWORDS,
    negativeKeywords: GOOGLE_NEGATIVE_KEYWORDS,
    utmCampaign: "google_search_intent",
    adCopy: {
      headlines: [...GOOGLE_SEARCH_HEADLINES],
      descriptions: [...GOOGLE_SEARCH_DESCRIPTIONS],
      cta: "Jetzt prüfen",
      finalUrl: `${APP}/check?utm_source=google&utm_medium=cpc&utm_campaign=google_search_intent`,
      path1: "NIS2-Check",
      path2: "Kostenlos",
    },
  },
  {
    id: "google_display_retarget_check",
    name: "Display — Check abgeschlossen, kein Kauf",
    type: "display_retargeting",
    objective: "conversions",
    budgetHint: "20% Budget · Audience: check_completed + kein upgrade",
    utmCampaign: "google_rtg_check",
    retargetingMessages: [
      "Sie haben Ihren NIS2-Status geprüft – jetzt fehlt der nächste Schritt.",
      "Ihr Ergebnis zeigt Handlungsbedarf – bauen Sie jetzt Struktur auf.",
    ],
    adCopy: {
      headlines: [
        "NIS2-Struktur jetzt aufbauen",
        "Ihr Ergebnis wartet auf Umsetzung",
        "Der nächste Schritt fehlt noch",
        "Jetzt NIS2-Status absichern",
      ],
      descriptions: [
        "Sie haben den Check abgeschlossen. Ohne Dokumentation fehlt der Nachweis.",
        "Bauen Sie jetzt Maßnahmen, Risiken und Audit-Struktur auf.",
      ],
      cta: "Jetzt handeln",
      finalUrl: `${APP}/upgrade?utm_source=google&utm_medium=display&utm_campaign=google_rtg_check`,
    },
  },
  {
    id: "google_display_retarget_visitor",
    name: "Display — Website-Besucher ohne Check",
    type: "display_retargeting",
    objective: "leads",
    budgetHint: "10% Budget · Audience: visitors, kein check_completed",
    utmCampaign: "google_rtg_visitor",
    retargetingMessages: ["Jetzt prüfen — in 2 Minuten wissen, ob Sie betroffen sind."],
    adCopy: {
      headlines: [
        "Noch kein NIS2-Check?",
        "Sind Sie betroffen?",
        "Jetzt kostenlos prüfen",
        "NIS2 Pflicht klären",
      ],
      descriptions: [
        "Viele KMU sind betroffen — ohne es zu wissen. Starten Sie den kostenlosen Check.",
        "4 Fragen. Sofortiges Ergebnis. Keine Registrierung nötig.",
      ],
      cta: "Jetzt prüfen",
      finalUrl: `${APP}/check?utm_source=google&utm_medium=display&utm_campaign=google_rtg_visitor`,
    },
  },
];

export function buildGoogleRsaCombinations(): {
  headline1: string;
  headline2: string;
  headline3: string;
  description1: string;
  description2: string;
}[] {
  const combos: ReturnType<typeof buildGoogleRsaCombinations> = [];
  const h = GOOGLE_SEARCH_HEADLINES;
  const d = GOOGLE_SEARCH_DESCRIPTIONS;

  for (let i = 0; i < h.length; i += 3) {
    combos.push({
      headline1: h[i] ?? h[0],
      headline2: h[i + 1] ?? h[1],
      headline3: h[i + 2] ?? h[2],
      description1: d[0],
      description2: d[1],
    });
  }
  return combos;
}
