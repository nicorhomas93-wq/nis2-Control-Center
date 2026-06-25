import type { SequenceId } from "@/lib/acquisition/follow-up/triggers";

export type NurtureEmailKey =
  | "day_0"
  | "day_1"
  | "day_3"
  | "day_5"
  | "day_7"
  | "high_intent_abandon";

export interface FollowUpEmailTemplate {
  sequenceId: SequenceId;
  key: NurtureEmailKey;
  day: number;
  subject: string;
  body: string;
}

export const STANDARD_NURTURE_DAYS = [0, 1, 3, 5, 7] as const;

export const FOLLOW_UP_EMAILS: FollowUpEmailTemplate[] = [
  {
    sequenceId: "standard_nurture",
    key: "day_0",
    day: 0,
    subject: "Ihr NIS2-Ergebnis",
    body: `{{greeting}}

Ihr NIS2-Schnellcheck ist abgeschlossen.

{{betroffenheit}} — {{problem_frame}}

Das eigentliche Problem ist selten die Betroffenheit allein. Es fehlt die vollständige Nachweisstruktur: dokumentierte Maßnahmen, nachvollziehbare Risiken, prüfbare Prozesse.

Im Ernstfall bleiben 72 Stunden zur Meldung.

→ Jetzt NIS2-Status aufbauen: {{cta_url}}

Hinweis: Keine Rechtsberatung. Keine Garantie auf vollständige Compliance.

Freundliche Grüße
TKND Unity GbR`,
  },
  {
    sequenceId: "standard_nurture",
    key: "day_1",
    day: 1,
    subject: "Das eigentliche Risiko bei NIS2",
    body: `{{greeting}}

bei NIS2 geht es selten um fehlendes Bewusstsein. Es geht um fehlende Nachweise.

Typische Lücken:
→ fehlende Dokumente
→ keine Struktur
→ keine Nachweise

Ohne prüfbare Struktur bleibt jedes Gespräch mit Prüfer, Partner oder Versicherung ein Risiko.

→ Struktur jetzt aufbauen: {{upgrade_url}}

Freundliche Grüße
TKND Unity GbR`,
  },
  {
    sequenceId: "standard_nurture",
    key: "day_3",
    day: 3,
    subject: "Was Sie wirklich brauchen (kein Berater)",
    body: `{{greeting}}

eine manuelle NIS2-Umsetzung dauert im Mittelstand oft 6–12 Monate — neben dem Tagesgeschäft.

Das TKND NIS2 Control Center setzt auf Struktur statt Einzelprojekt:

→ fertige Dokumente
→ klare Maßnahmen
→ Audit-Export

Tage statt Monate — ohne externen Berater als Dauerlösung.

→ Jetzt automatisieren: {{upgrade_url}}

Freundliche Grüße
TKND Unity GbR`,
  },
  {
    sequenceId: "standard_nurture",
    key: "day_5",
    day: 5,
    subject: "Was passiert, wenn Sie nichts tun",
    body: `{{greeting}}

Stellen Sie sich vor:

→ Ein Sicherheitsvorfall passiert
→ Es fehlen Dokumente
→ Es fehlen Nachweise

Die Folge ist nicht nur rechtliches Risiko — sondern Stress, Zeitdruck und Aufwand genau dann, wenn Ihr Betrieb unter Druck steht.

Ihr Ergebnis ({{result_label}}) zeigt: Handlungsbedarf besteht.

→ Jetzt vorbereiten: {{upgrade_url}}

Freundliche Grüße
TKND Unity GbR`,
  },
  {
    sequenceId: "standard_nurture",
    key: "day_7",
    day: 7,
    subject: "Letzte Erinnerung zu Ihrem NIS2-Status",
    body: `{{greeting}}

kurze Erinnerung zu Ihrem NIS2-Check:

{{betroffenheit}}.
Die Struktur fehlt weiterhin.

Ohne dokumentierte Maßnahmen und Nachweise bleibt Ihr Risiko hoch — unabhängig davon, ob Sie intern „daran arbeiten“.

→ Jetzt starten (kostenlos): {{upgrade_url}}

Freundliche Grüße
TKND Unity GbR`,
  },
  {
    sequenceId: "high_intent",
    key: "high_intent_abandon",
    day: 0,
    subject: "Sie waren kurz davor",
    body: `{{greeting}}

Sie haben sich bereits mit Ihrem NIS2-Status beschäftigt — der nächste Schritt fehlt noch.

Ein Upgrade oder Pilot-Start dauert wenige Minuten. Danach haben Sie eine Struktur, die Sie bei Prüfung, Vorfall oder Partner-Anfrage vorlegen können.

→ Jetzt abschließen: {{upgrade_url}}

Freundliche Grüße
TKND Unity GbR`,
  },
];

export function getEmailTemplate(
  sequenceId: SequenceId,
  key: NurtureEmailKey
): FollowUpEmailTemplate | undefined {
  return FOLLOW_UP_EMAILS.find((e) => e.sequenceId === sequenceId && e.key === key);
}

export function getStandardNurtureTemplates(): FollowUpEmailTemplate[] {
  return FOLLOW_UP_EMAILS.filter((e) => e.sequenceId === "standard_nurture");
}

export function scheduleDayOffset(day: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + day);
  d.setHours(9, 0, 0, 0);
  return d;
}
