import type { IcpSegment } from "@/lib/acquisition/icp";
import { ICP_SEGMENTS } from "@/lib/acquisition/icp";
import { buildTrackedUrl } from "@/lib/acquisition/traffic-engine";

export type LinkedInOutreachStep =
  | "profile_optimization"
  | "icp_targeting"
  | "connection_request"
  | "value_message"
  | "funnel_redirect";

export interface LinkedInMessageTemplate {
  step: LinkedInOutreachStep;
  name: string;
  subject?: string;
  body: string;
  delayDays: number;
  complianceNotes: string[];
}

export const LINKEDIN_PROFILE_CHECKLIST: string[] = [
  "Headline: NIS2 & IT-Sicherheit für den deutschen Mittelstand",
  "Banner: TKND NIS2 Control Center — Betroffenheit prüfen in 2 Minuten",
  "About: Problem → Lösung → kostenloser Check (kein Hype)",
  "Featured: Link zu /check mit UTM linkedin_profile",
  "Experience: Compliance-Dokumentation, KMU-Fokus",
  "Keine Automation-Tools — manuell, DSGVO-konform",
];

export const LINKEDIN_ICP_FILTERS = ICP_SEGMENTS.flatMap((s) =>
  s.linkedinFilters.map((f) => ({ segment: s.name, filter: f }))
);

export const LINKEDIN_MESSAGE_SEQUENCE: LinkedInMessageTemplate[] = [
  {
    step: "connection_request",
    name: "Verbindungsanfrage",
    body: `Guten Tag {{first_name}},

ich beschäftige mich mit NIS2-Umsetzung im Mittelstand. Gerne vernetze ich mich mit Verantwortlichen aus {{industry}}.

Beste Grüße
{{sender_name}}`,
    delayDays: 0,
    complianceNotes: [
      "Kein Verkauf in der Anfrage",
      "Max. 300 Zeichen",
      "Nur nach manueller Profilprüfung",
      "Opt-out respektieren",
    ],
  },
  {
    step: "value_message",
    name: "Erste Nachricht — Problem",
    body: `Guten Tag {{first_name}},

vielen Dank für die Vernetzung.

Viele Geschäftsführer und IT-Leiter im Mittelstand fragen sich derzeit: Sind wir NIS2-betroffen — und reicht unsere Dokumentation?

Häufig fehlt eine prüfbare Struktur: Betroffenheit, Maßnahmen, Incident-Prozesse.

Beste Grüße
{{sender_name}}`,
    delayDays: 1,
    complianceNotes: [
      "Nur nach angenommener Anfrage",
      "Kein Link in erster Nachricht",
      "Problem-Fokus, kein Produktpitch",
    ],
  },
  {
    step: "value_message",
    name: "Zweite Nachricht — NIS2-Check",
    body: `Guten Tag {{first_name}},

kurzer Hinweis: Wir haben einen kostenlosen NIS2-Schnellcheck für KMU entwickelt — 4 Fragen, Ergebnis in unter 2 Minuten.

Keine Registrierung nötig für den Check. Er zeigt, ob eine Betroffenheit wahrscheinlich ist und wo Lücken bestehen.

Interesse?`,
    delayDays: 3,
    complianceNotes: [
      "Wertorientiert formulieren",
      "Kein Druck",
      "Bei Ablehnung: nicht erneut kontaktieren",
    ],
  },
  {
    step: "funnel_redirect",
    name: "Dritte Nachricht — Link",
    body: `Guten Tag {{first_name}},

hier der direkte Link zum NIS2-Schnellcheck:

{{check_url}}

Bei Fragen zur Umsetzung melden Sie sich gerne.

Beste Grüße
{{sender_name}}`,
    delayDays: 5,
    complianceNotes: [
      "UTM-Tracking setzen",
      "Max. 1 Follow-up nach Link",
      "DSGVO: berechtigtes Interesse dokumentieren",
    ],
  },
];

export function renderLinkedInMessage(
  template: LinkedInMessageTemplate,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template.body
  );
}

export function getLinkedInCheckUrl(segment?: IcpSegment): string {
  const campaign = segment ? `linkedin_${segment.id}` : "linkedin_outreach";
  return buildTrackedUrl("/check", "linkedin", campaign);
}

export const LINKEDIN_OUTREACH_WORKFLOW: {
  step: LinkedInOutreachStep;
  title: string;
  action: string;
}[] = [
  {
    step: "profile_optimization",
    title: "Profil optimieren",
    action: "Checklist abarbeiten — Featured Link auf /check",
  },
  {
    step: "icp_targeting",
    title: "ICP filtern",
    action: "LinkedIn Sales Navigator: Branche, Größe 20–500, Rolle GF/IT-Leiter, DE",
  },
  {
    step: "connection_request",
    title: "Verbindungsanfrage",
    action: "Neutral, ohne Pitch — Template 1",
  },
  {
    step: "value_message",
    title: "Wert-Nachrichten",
    action: "Tag 1 + 3: Problem → Check — Templates 2–3",
  },
  {
    step: "funnel_redirect",
    title: "Funnel-Link",
    action: "Tag 5: /check mit UTM — Template 4",
  },
];
