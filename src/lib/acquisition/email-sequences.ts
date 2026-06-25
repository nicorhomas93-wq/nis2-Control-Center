export const EMAIL_SEQUENCE_DAYS = [0, 1, 3, 5] as const;

export type EmailSequenceDay = (typeof EMAIL_SEQUENCE_DAYS)[number];

export interface SequenceEmail {
  day: EmailSequenceDay;
  purpose: string;
  subject: string;
  bodyTemplate: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nis2-control-center.vercel.app";

export const NURTURE_EMAIL_SEQUENCE: SequenceEmail[] = [
  {
    day: 0,
    purpose: "acquisition_day_0",
    subject: "Ihr NIS2-Check Ergebnis — nächste Schritte",
    bodyTemplate: `Hallo,

vielen Dank für Ihren NIS2-Schnellcheck.

{{result_summary}}

Ohne vollständige Dokumentation bleibt Ihr Risiko bei einer Prüfung oder einem Vorfall hoch.

→ Jetzt Struktur aufbauen: ${APP_URL}/upgrade

Hinweis: Keine Rechtsberatung. Keine Garantie auf vollständige Compliance.

Freundliche Grüße
TKND Unity GbR`,
  },
  {
    day: 1,
    purpose: "acquisition_day_1",
    subject: "Was passiert ohne NIS2-Nachweise?",
    bodyTemplate: `Hallo,

kurz zum Risiko:

• Keine vollständige Dokumentation
• Unklare Maßnahmen
• Kein prüfbarer Status

Im Ernstfall bleiben 72 Stunden zur Meldung.

→ Ergebnis erneut ansehen: ${APP_URL}/result

Freundliche Grüße
TKND Unity GbR`,
  },
  {
    day: 3,
    purpose: "acquisition_day_3",
    subject: "NIS2-Struktur in Tagen statt Monaten",
    bodyTemplate: `Hallo,

das TKND NIS2 Control Center hilft Ihnen:

• Betroffenheit prüfen
• Pflichtdokumente erstellen
• Maßnahmen und Risiken nachverfolgen
• Audit-Ordner exportieren

→ Jetzt starten: ${APP_URL}/upgrade

Freundliche Grüße
TKND Unity GbR`,
  },
  {
    day: 5,
    purpose: "acquisition_day_5",
    subject: "Ihr NIS2-Setup — Pilot oder Abo",
    bodyTemplate: `Hallo,

Sie haben den NIS2-Check abgeschlossen. Jetzt fehlt die Umsetzung.

{{offer_line}}

→ Pilot starten (499 € einmalig): ${APP_URL}/upgrade?offer=pilot
→ Abo wählen: ${APP_URL}/upgrade

Freundliche Grüße
TKND Unity GbR`,
  },
];

export function renderSequenceEmail(
  day: EmailSequenceDay,
  vars: Record<string, string>
): { subject: string; body: string } {
  const template = NURTURE_EMAIL_SEQUENCE.find((e) => e.day === day);
  if (!template) throw new Error(`Unknown sequence day: ${day}`);

  const apply = (text: string) =>
    Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), text);

  return {
    subject: apply(template.subject),
    body: apply(template.bodyTemplate),
  };
}

export function scheduleEmailAt(baseDate: Date, day: EmailSequenceDay): Date {
  const scheduled = new Date(baseDate);
  scheduled.setDate(scheduled.getDate() + day);
  scheduled.setHours(9, 0, 0, 0);
  return scheduled;
}
