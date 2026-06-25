export type RetargetingAudienceId = "visitors_no_check" | "check_no_purchase" | "upgrade_no_purchase";

export interface RetargetingAudience {
  id: RetargetingAudienceId;
  name: string;
  definition: string;
  acquisitionSignal: string;
  googleCampaignId: string;
  linkedinCampaignId: string;
  message: string;
  cta: string;
  landingPath: string;
  utmCampaign: string;
  windowDays: number;
}

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://nis2-control-center.vercel.app";

export const RETARGETING_AUDIENCES: RetargetingAudience[] = [
  {
    id: "visitors_no_check",
    name: "Besucher ohne Check",
    definition: "page_view auf / oder /check, kein check_completed",
    acquisitionSignal: "retargeting_eligible OR visit_count ≥ 1 ohne check",
    googleCampaignId: "google_display_retarget_visitor",
    linkedinCampaignId: "linkedin_awareness",
    message: "Jetzt prüfen — in 2 Minuten wissen, ob Sie NIS2-betroffen sind.",
    cta: "Jetzt prüfen",
    landingPath: "/check",
    utmCampaign: "rtg_visitor",
    windowDays: 30,
  },
  {
    id: "check_no_purchase",
    name: "Check abgeschlossen, kein Kauf",
    definition: "check_completed, kein upgrade_click, kein converted",
    acquisitionSignal: "lifecycle_status in (check_complete, nurturing, awaiting_email)",
    googleCampaignId: "google_display_retarget_check",
    linkedinCampaignId: "linkedin_retargeting",
    message: "Ergebnis verstanden – jetzt handeln. Ohne Struktur fehlt der Nachweis.",
    cta: "Jetzt handeln",
    landingPath: "/upgrade",
    utmCampaign: "rtg_check",
    windowDays: 30,
  },
  {
    id: "upgrade_no_purchase",
    name: "Upgrade besucht, kein Kauf",
    definition: "upgrade_page_visit oder upgrade_page_leave, kein converted",
    acquisitionSignal: "lifecycle_status = high_intent OR last_trigger = upgrade_abandon",
    googleCampaignId: "google_display_retarget_check",
    linkedinCampaignId: "linkedin_retargeting",
    message: "Sie waren kurz davor — jetzt abschließen.",
    cta: "Jetzt abschließen",
    landingPath: "/upgrade",
    utmCampaign: "rtg_upgrade",
    windowDays: 14,
  },
];

export const RETARGETING_MESSAGES = {
  google: {
    checkCompleted: [
      "Sie haben Ihren NIS2-Status geprüft – jetzt fehlt der nächste Schritt.",
      "Ihr Ergebnis zeigt Handlungsbedarf – bauen Sie jetzt Struktur auf.",
    ],
    upgradeAbandon: ["Sie waren kurz davor — schließen Sie jetzt ab."],
    visitor: ["Noch nicht geprüft? Kostenloser NIS2-Check in 2 Minuten."],
  },
  linkedin: {
    checkCompleted: [
      "Sie waren kurz davor – klären Sie Ihren Status jetzt vollständig.",
      "Ihr Ergebnis ist klar – der nächste Schritt fehlt noch.",
    ],
    upgradeAbandon: ["Jetzt abschließen — Struktur, Dokumente, Nachweise."],
    visitor: ["Sind Sie NIS2 betroffen? Jetzt kostenlos prüfen."],
  },
} as const;

export function buildRetargetingUrl(audience: RetargetingAudience): string {
  return `${APP}${audience.landingPath}?utm_source=retargeting&utm_medium=paid&utm_campaign=${audience.utmCampaign}`;
}

export function mapAcquisitionToAudience(options: {
  checkCompleted: boolean;
  upgraded: boolean;
  upgradeVisited: boolean;
}): RetargetingAudienceId | null {
  if (options.upgraded) return null;
  if (options.upgradeVisited || options.checkCompleted) {
    return options.upgradeVisited ? "upgrade_no_purchase" : "check_no_purchase";
  }
  return "visitors_no_check";
}
