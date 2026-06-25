export type LinkedInCampaignType = "problem_awareness" | "direct_conversion" | "retargeting";

export interface LinkedInAdVariant {
  id: string;
  hook: string;
  introText: string;
  headline: string;
  cta: string;
  destinationUrl: string;
}

export interface LinkedInCampaign {
  id: string;
  name: string;
  type: LinkedInCampaignType;
  objective: "lead_generation" | "website_conversions" | "retargeting";
  targeting: string[];
  variants: LinkedInAdVariant[];
  utmCampaign: string;
}

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://nis2-control-center.vercel.app";

export const LINKEDIN_CAMPAIGNS: LinkedInCampaign[] = [
  {
    id: "linkedin_awareness",
    name: "Problem Awareness — NIS2 Betroffenheit",
    type: "problem_awareness",
    objective: "lead_generation",
    utmCampaign: "linkedin_awareness",
    targeting: [
      "Standort: Deutschland",
      "Unternehmensgröße: 11–500",
      "Funktion: Geschäftsführung, IT, Sicherheit",
      "Branchen: Produktion, Logistik, IT-Dienstleistungen, Finanz",
    ],
    variants: [
      {
        id: "li_aw_1",
        hook: "Die meisten Unternehmen sind NIS2 betroffen – ohne es zu wissen.",
        introText: `Sind Sie NIS2-pflichtig – und können Sie das nachweisen?

In vielen Unternehmen fehlt die vollständige Dokumentation.
Im Ernstfall bleiben nur 72 Stunden zur Meldung.`,
        headline: "Sind Sie NIS2 betroffen?",
        cta: "Jetzt prüfen",
        destinationUrl: `${APP}/check?utm_source=linkedin&utm_medium=paid&utm_campaign=linkedin_awareness`,
      },
      {
        id: "li_aw_2",
        hook: "Die Frage ist nicht ob – sondern wann Sie es nachweisen müssen.",
        introText: `NIS2 betrifft mehr KMU als erwartet.

Ohne Nachweisstruktur bleiben Sie bei Prüfung oder Vorfall ungeschützt.
Klären Sie Ihren Status in wenigen Minuten.`,
        headline: "NIS2 Nachweis fehlt?",
        cta: "Jetzt prüfen",
        destinationUrl: `${APP}/check?utm_source=linkedin&utm_medium=paid&utm_campaign=linkedin_awareness`,
      },
    ],
  },
  {
    id: "linkedin_conversion",
    name: "Direct Conversion — NIS2 Check",
    type: "direct_conversion",
    objective: "website_conversions",
    utmCampaign: "linkedin_conversion",
    targeting: [
      "Standort: Deutschland",
      "Unternehmensgröße: 20–500",
      "Funktion: Geschäftsführer, IT-Leiter, CISO",
      "Interessen: IT-Sicherheit, Compliance, Datenschutz",
    ],
    variants: [
      {
        id: "li_conv_1",
        hook: "Prüfen Sie jetzt Ihren NIS2-Status in wenigen Minuten",
        introText: `Klären Sie sofort, ob Ihr Unternehmen betroffen ist.

Erhalten Sie Ihr Ergebnis und bauen Sie Ihre Struktur direkt auf.
4 Fragen. Keine Registrierung für den Check.`,
        headline: "NIS2 Check für KMU",
        cta: "NIS2 Check starten",
        destinationUrl: `${APP}/check?utm_source=linkedin&utm_medium=paid&utm_campaign=linkedin_conversion`,
      },
      {
        id: "li_conv_2",
        hook: "72 Stunden Meldefrist — ist Ihre Struktur vorbereitet?",
        introText: `Ohne Dokumentation kein Nachweis.

Starten Sie mit dem kostenlosen NIS2-Schnellcheck und wissen Sie, wo Sie stehen.`,
        headline: "Jetzt NIS2 Status prüfen",
        cta: "NIS2 Check starten",
        destinationUrl: `${APP}/check?utm_source=linkedin&utm_medium=paid&utm_campaign=linkedin_conversion`,
      },
    ],
  },
  {
    id: "linkedin_retargeting",
    name: "Retargeting — Check / Upgrade Abbruch",
    type: "retargeting",
    objective: "retargeting",
    utmCampaign: "linkedin_retargeting",
    targeting: [
      "Matched Audience: Website-Besucher 30 Tage",
      "Segment: check_completed OR upgrade_page_visit",
      "Ausschluss: converted / paid",
    ],
    variants: [
      {
        id: "li_rtg_1",
        hook: "Sie waren kurz davor – klären Sie Ihren Status jetzt vollständig.",
        introText: `Sie haben sich bereits mit Ihrem NIS2-Status beschäftigt.

Der nächste Schritt fehlt noch: Struktur, Dokumente, Nachweise.`,
        headline: "NIS2-Struktur vervollständigen",
        cta: "Jetzt abschließen",
        destinationUrl: `${APP}/upgrade?utm_source=linkedin&utm_medium=paid&utm_campaign=linkedin_retargeting`,
      },
      {
        id: "li_rtg_2",
        hook: "Ihr Ergebnis ist klar – der nächste Schritt fehlt noch.",
        introText: `Ihr Check zeigt Handlungsbedarf.

Bauen Sie jetzt die fehlende Nachweisstruktur auf — in Tagen statt Monaten.`,
        headline: "Jetzt Struktur aufbauen",
        cta: "Jetzt abschließen",
        destinationUrl: `${APP}/upgrade?utm_source=linkedin&utm_medium=paid&utm_campaign=linkedin_retargeting`,
      },
    ],
  },
];

export const LINKEDIN_SINGLE_IMAGE_SPECS = {
  recommendedSize: "1200 x 627 px",
  format: "PNG or JPG",
  textOnImageMax: "20% der Fläche",
  style: "Clean B2B — weißer Hintergrund, rote Akzente für Risiko",
};
