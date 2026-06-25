export type ContentFormat = "linkedin_post" | "blog_article" | "checklist" | "carousel";

export interface ContentPiece {
  id: string;
  topic: string;
  format: ContentFormat;
  title: string;
  hook: string;
  body: string;
  cta: string;
  funnelPath: string;
  publishDay?: number;
}

export const CONTENT_TOPICS = [
  "Bin ich NIS2 betroffen?",
  "72 Stunden Meldefrist",
  "NIS2 für KMU erklärt",
  "Dokumentationslücken im Mittelstand",
  "Incident-Response ohne Plan",
] as const;

export const CONTENT_CALENDAR: ContentPiece[] = [
  {
    id: "li_betroffenheit_1",
    topic: "Bin ich NIS2 betroffen?",
    format: "linkedin_post",
    title: "3 Signale, dass Ihr KMU NIS2-betroffen sein könnte",
    hook: "Die meisten Geschäftsführer unterschätzen eine Frage:",
    body: `1. Verarbeiten Sie Daten für Kunden oder Partner?
2. Sind IT-Systeme für Ihren Betrieb unverzichtbar?
3. Liefern Sie an Unternehmen in kritischen Sektoren?

Wenn 2× Ja: Betroffenheit prüfen — nicht raten.

→ Kostenloser 4-Fragen-Check (2 Min.)`,
    cta: "Jetzt prüfen",
    funnelPath: "/check",
    publishDay: 1,
  },
  {
    id: "li_72h_1",
    topic: "72 Stunden Meldefrist",
    format: "linkedin_post",
    title: "72 Stunden — und dann?",
    hook: "Bei erheblichen Sicherheitsvorfällen zählt die Uhr.",
    body: `Ohne dokumentierten Incident-Prozess verlieren Sie Zeit:
• Wer meldet wem?
• Welche Informationen sind Pflicht?
• Wo liegen die Nachweise?

Die Meldefrist wartet nicht auf Ihre Dokumentation.`,
    cta: "Risiko prüfen",
    funnelPath: "/check",
    publishDay: 3,
  },
  {
    id: "li_kmu_1",
    topic: "NIS2 für KMU erklärt",
    format: "linkedin_post",
    title: "NIS2 ist kein Enterprise-Thema",
    hook: "KMU mit 50+ Mitarbeitenden sind häufig betroffen.",
    body: `NIS2 verlangt nachweisbare Maßnahmen — nicht nur gute Absichten:
✗ Excel-Listen verstreut
✗ Policies ohne Versionierung
✗ Risiken ohne Bewertung

Was zählt: prüfbare Struktur.`,
    cta: "Kostenlosen Check starten",
    funnelPath: "/check",
    publishDay: 5,
  },
  {
    id: "blog_betroffenheit",
    topic: "Bin ich NIS2 betroffen?",
    format: "blog_article",
    title: "NIS2-Betroffenheit für deutsche KMU: Der 4-Fragen-Check",
    hook: "Viele Mittelständler wissen nicht, ob NIS2 auf sie zutrifft.",
    body: `## Einleitung
NIS2 erweitert die Pflichten für Unternehmen mit IT-Abhängigkeit und sicherheitsrelevanter Tätigkeit.

## 4 Fragen
1. Unternehmensgröße
2. Branche
3. Kritische Infrastruktur / Lieferkette
4. IT-Abhängigkeit

## Ergebnis
→ Online-Check nutzen statt Monate recherchieren.`,
    cta: "Zum NIS2-Check",
    funnelPath: "/check",
  },
  {
    id: "checklist_audit",
    topic: "Dokumentationslücken im Mittelstand",
    format: "checklist",
    title: "NIS2-Readiness Checkliste (KMU)",
    hook: "10 Punkte — ehrlich abhaken.",
    body: `□ Betroffenheit dokumentiert
□ Sicherheitskontakt benannt
□ Risikoanalyse aktuell
□ Incident-Response-Plan vorhanden
□ Maßnahmen mit Verantwortlichen
□ Lieferanten-Risiken erfasst
□ Schulungsnachweise
□ Meldeprozess definiert
□ Audit-Ordner strukturiert
□ Letzte Prüfung < 12 Monate`,
    cta: "Lücken identifizieren",
    funnelPath: "/check",
  },
];

export function getWeeklyContentPlan(weekOffset = 0): ContentPiece[] {
  const startDay = weekOffset * 7;
  return CONTENT_CALENDAR.filter(
    (c) => c.publishDay !== undefined && c.publishDay > startDay && c.publishDay <= startDay + 7
  );
}

export function getContentByTopic(topic: string): ContentPiece[] {
  return CONTENT_CALENDAR.filter((c) => c.topic === topic);
}
