export type CreativeFormat = "text_only" | "single_image" | "carousel";

export interface AdCreative {
  id: string;
  format: CreativeFormat;
  platform: "google" | "linkedin" | "both";
  headline: string;
  subline: string;
  visualConcept: string;
  visualElements: string[];
  colorScheme: string;
  cta: string;
  rules: string[];
}

export const AD_CREATIVE_RULES = [
  "Headline immer: Frage oder Risiko",
  "Kein Hype, kein Buzzword-Stacking",
  "Deutsch, Sie-Form, B2B-Ton",
  "Ein klarer CTA pro Anzeige",
  "Landing immer /check oder /upgrade (je nach Funnel-Stufe)",
];

export const AD_CREATIVES: AdCreative[] = [
  {
    id: "creative_72h_warning",
    format: "single_image",
    platform: "both",
    headline: "72 Stunden Meldefrist",
    subline: "Ist Ihre NIS2-Struktur vorbereitet?",
    visualConcept: "Roter Warnhinweis 72h — minimalistisch",
    visualElements: ["Große rote 72h", "Kleiner Text: Meldepflicht bei Sicherheitsvorfällen", "Logo unten rechts"],
    colorScheme: "Weiß + Rot (#DC2626) + Slate Text",
    cta: "Jetzt prüfen",
    rules: AD_CREATIVE_RULES,
  },
  {
    id: "creative_betroffen_ja_nein",
    format: "single_image",
    platform: "both",
    headline: "Betroffen? Ja / Nein",
    subline: "In 2 Minuten wissen — nicht raten.",
    visualConcept: "Ja/Nein Entscheidungs-Visual",
    visualElements: ["Zwei Karten: Ja | Nein", "Frage oben: NIS2 betroffen?", "CTA-Button Mockup"],
    colorScheme: "Brand Blau + Neutrale Grautöne",
    cta: "NIS2 Check starten",
    rules: AD_CREATIVE_RULES,
  },
  {
    id: "creative_checklist",
    format: "single_image",
    platform: "both",
    headline: "NIS2-Dokumentation fehlt?",
    subline: "Typische Lücken im Mittelstand.",
    visualConcept: "Checkliste mit offenen Punkten",
    visualElements: [
      "☐ Betroffenheit dokumentiert",
      "☐ Incident-Prozess",
      "☐ Risikoanalyse",
      "☐ Audit-Ordner",
    ],
    colorScheme: "Weiß, Amber für Warnung, Grün für CTA",
    cta: "Jetzt prüfen",
    rules: AD_CREATIVE_RULES,
  },
  {
    id: "creative_audit_structure",
    format: "single_image",
    platform: "linkedin",
    headline: "Ohne Nachweis kein Schutz",
    subline: "Struktur statt Excel-Chaos.",
    visualConcept: "Ordner/Audit-Export Visual",
    visualElements: ["Ordner-Icon", "Export-Pfeil", "Text: Audit-ready in Tagen"],
    colorScheme: "Slate + Brand",
    cta: "Struktur aufbauen",
    rules: AD_CREATIVE_RULES,
  },
  {
    id: "creative_text_only_b2b",
    format: "text_only",
    platform: "linkedin",
    headline: "Sind Sie NIS2-pflichtig?",
    subline: "Kostenloser 4-Fragen-Check für KMU.",
    visualConcept: "Kein Bild — nur Text (LinkedIn Sponsored Content)",
    visualElements: [],
    colorScheme: "n/a",
    cta: "Jetzt prüfen",
    rules: AD_CREATIVE_RULES,
  },
];

export const RSA_PINNING = {
  headline1: "Immer Frage oder Risiko (Position 1)",
  headline2: "Produkt/Check (Position 2)",
  headline3: "Dringlichkeit 72h oder Nachweis (Position 3)",
};
