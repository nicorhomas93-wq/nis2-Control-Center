import type { TrafficChannel } from "@/lib/acquisition/types";

export interface TrafficStage {
  id: string;
  name: string;
  goal: string;
  channels: TrafficChannel[];
  assets: string[];
  kpis: string[];
}

export interface TrafficChannelConfig {
  channel: TrafficChannel;
  name: string;
  role: "awareness" | "conversion" | "retention";
  entryPoints: string[];
  cta: string;
  trackingParams: string;
}

export const TRAFFIC_FLOW: TrafficStage[] = [
  {
    id: "awareness",
    name: "Awareness",
    goal: "Problem sichtbar machen — NIS2-Betroffenheit im Mittelstand",
    channels: ["organic", "linkedin"],
    assets: [
      "LinkedIn-Posts (Problem-basiert)",
      "Autoritäts-Positionierung Geschäftsführer/IT-Leiter",
      "Blog-Artikel: Betroffenheit, 72h-Meldefrist",
    ],
    kpis: ["Impressionen", "Profilbesuche", "Content-Engagement"],
  },
  {
    id: "interest",
    name: "Interest",
    goal: "Klick auf Landing Page / NIS2-Check",
    channels: ["organic", "tool", "linkedin"],
    assets: [
      "Landing Page nis2-control-center.vercel.app",
      "CTA: Kostenlosen NIS2-Check starten",
      "LinkedIn → /check",
    ],
    kpis: ["Klicks", "CTR", "Landing-Page-Besuche"],
  },
  {
    id: "conversion",
    name: "Conversion",
    goal: "Check abschließen → Lead → Paid",
    channels: ["tool", "retargeting"],
    assets: [
      "/check → /result → /upgrade",
      "E-Mail-Nurturing Tag 0–5",
      "Retargeting LinkedIn / Google",
    ],
    kpis: ["Check-Abschlüsse", "E-Mail-Captures", "Checkout-Starts", "Paid"],
  },
];

export const TRAFFIC_CHANNELS: TrafficChannelConfig[] = [
  {
    channel: "organic",
    name: "LinkedIn Organic",
    role: "awareness",
    entryPoints: ["/", "/check"],
    cta: "Jetzt prüfen",
    trackingParams: "utm_source=linkedin&utm_medium=organic&utm_campaign=nis2_content",
  },
  {
    channel: "tool",
    name: "NIS2-Check (Lead Magnet)",
    role: "conversion",
    entryPoints: ["/check", "/result"],
    cta: "Kostenlosen NIS2-Check starten",
    trackingParams: "utm_source=direct&utm_medium=tool&utm_campaign=nis2_check",
  },
  {
    channel: "retargeting",
    name: "Retargeting (LinkedIn / Google)",
    role: "retention",
    entryPoints: ["/", "/check", "/upgrade"],
    cta: "NIS2-Check fortsetzen",
    trackingParams: "utm_source=retargeting&utm_medium=paid&utm_campaign=nis2_return",
  },
  {
    channel: "linkedin",
    name: "LinkedIn Outreach (manuell)",
    role: "awareness",
    entryPoints: ["/check"],
    cta: "Kostenloser NIS2-Check",
    trackingParams: "utm_source=linkedin&utm_medium=outreach&utm_campaign=connection",
  },
];

export function buildTrackedUrl(
  basePath: string,
  channel: TrafficChannel,
  campaign?: string
): string {
  const config = TRAFFIC_CHANNELS.find((c) => c.channel === channel);
  const params = new URLSearchParams(config?.trackingParams ?? "");
  if (campaign) params.set("utm_campaign", campaign);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://nis2-control-center.vercel.app";
  return `${origin}${basePath}?${params.toString()}`;
}

export function getRetargetingAudienceCriteria(): string[] {
  return [
    "Besucher /check ohne Abschluss (page_leave)",
    "Besucher /result ohne Upgrade-Klick",
    "Lead Score ≥ 30, kein Paid",
    "Retargeting-Fenster: 30 Tage",
    "Plattformen: LinkedIn Matched Audiences, Google Ads Remarketing",
  ];
}
