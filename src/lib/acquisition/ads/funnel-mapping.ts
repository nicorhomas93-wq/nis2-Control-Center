export interface FunnelStep {
  step: number;
  name: string;
  path: string;
  adSources: string[];
  cta: string;
  conversionGoal: string;
  kpis: string[];
}

export const PAID_AD_FUNNEL: FunnelStep[] = [
  {
    step: 1,
    name: "Ad Click",
    path: "—",
    adSources: ["Google Search", "Google Display", "LinkedIn Sponsored"],
    cta: "Jetzt prüfen / NIS2 Check starten",
    conversionGoal: "Klick mit UTM",
    kpis: ["CTR", "CPC", "CPM"],
  },
  {
    step: 2,
    name: "Landing / Check Start",
    path: "/check",
    adSources: ["google_search_intent", "linkedin_awareness", "linkedin_conversion", "rtg_visitor"],
    cta: "Jetzt prüfen",
    conversionGoal: "check_started",
    kpis: ["Check-Start-Rate", "Bounce Rate"],
  },
  {
    step: 3,
    name: "NIS2 Check",
    path: "/check → /result",
    adSources: ["all lead campaigns"],
    cta: "Status jetzt prüfen",
    conversionGoal: "check_completed",
    kpis: ["Check-Abschlussrate", "Cost per Check"],
  },
  {
    step: 4,
    name: "Result",
    path: "/result",
    adSources: ["retargeting prep"],
    cta: "Jetzt vollständige NIS2-Compliance herstellen",
    conversionGoal: "email_captured OR upgrade_click",
    kpis: ["E-Mail-Capture-Rate", "Upgrade-Klick-Rate"],
  },
  {
    step: 5,
    name: "Upgrade",
    path: "/upgrade",
    adSources: ["rtg_check", "rtg_upgrade", "linkedin_retargeting"],
    cta: "Abo starten / Pilot starten",
    conversionGoal: "Stripe Checkout",
    kpis: ["Checkout-Start", "Cost per Acquisition"],
  },
  {
    step: 6,
    name: "Purchase",
    path: "/success",
    adSources: ["—"],
    cta: "Dashboard",
    conversionGoal: "converted (Stripe webhook)",
    kpis: ["Paid Conversion Rate", "ROAS", "LTV"],
  },
];

export const CAMPAIGN_TO_FUNNEL_ENTRY: Record<string, string> = {
  google_search_intent: "/check",
  google_rtg_visitor: "/check",
  google_rtg_check: "/upgrade",
  linkedin_awareness: "/check",
  linkedin_conversion: "/check",
  linkedin_retargeting: "/upgrade",
  rtg_visitor: "/check",
  rtg_check: "/upgrade",
  rtg_upgrade: "/upgrade",
};

export const PAID_MEDIA_BUDGET_SPLIT = {
  google_search: 0.5,
  google_display: 0.15,
  linkedin_awareness: 0.15,
  linkedin_conversion: 0.1,
  linkedin_retargeting: 0.1,
};

export const PRIMARY_CONVERSION_ACTIONS = [
  { platform: "Google Ads", action: "check_completed (Custom Event / URL /check + thank you)" },
  { platform: "Google Ads", action: "purchase (Stripe success URL)" },
  { platform: "LinkedIn", action: "Website Conversion: /result oder /success" },
  { platform: "LinkedIn", action: "Lead Gen Form optional — Redirect /check" },
];
