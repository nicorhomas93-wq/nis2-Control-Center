import { STRONG_OFFER_THRESHOLD } from "@/lib/acquisition/types";

export interface FunnelStage {
  id: string;
  path: string;
  name: string;
  cta: string;
  nextStage: string | null;
  frictionRules: string[];
}

export const CONVERSION_FUNNEL: FunnelStage[] = [
  {
    id: "landing",
    path: "/",
    name: "Landing Page",
    cta: "Kostenlosen NIS2-Check starten",
    nextStage: "check",
    frictionRules: [
      "Ein primärer CTA above the fold",
      "Kein Login für Check",
      "Social Proof / Risiko-Trigger sichtbar",
    ],
  },
  {
    id: "check",
    path: "/check",
    name: "NIS2-Schnellcheck",
    cta: "Jetzt prüfen",
    nextStage: "result",
    frictionRules: [
      "4 Fragen, eine pro Schritt",
      "Progress-Bar",
      "Keine E-Mail vor Ergebnis",
      "Auto-Advance bei Auswahl",
    ],
  },
  {
    id: "result",
    path: "/result",
    name: "Ergebnis",
    cta: "Jetzt vollständige NIS2-Compliance herstellen",
    nextStage: "upgrade",
    frictionRules: [
      "Problem-Frame prominent",
      "72h-Meldefrist als Dringlichkeit",
      "E-Mail optional für Follow-up",
      "Score > 60: stärkeres Angebot",
    ],
  },
  {
    id: "upgrade",
    path: "/upgrade",
    name: "Plan wählen",
    cta: "Abo starten",
    nextStage: "success",
    frictionRules: [
      "3 Pläne klar differenziert",
      "Stripe Checkout in 1 Klick",
      "Pilot separat (499 € einmalig)",
    ],
  },
  {
    id: "success",
    path: "/success",
    name: "Conversion",
    cta: "Zum Dashboard",
    nextStage: null,
    frictionRules: ["Auto-Redirect Dashboard", "Onboarding-Banner"],
  },
];

export function getStrongOfferCta(score: number): {
  headline: string;
  cta: string;
  subline: string;
} {
  if (score >= STRONG_OFFER_THRESHOLD) {
    return {
      headline: "Hohe Betroffenheit — jetzt Struktur aufbauen",
      cta: "Pilot starten — 499 € einmalig",
      subline: "30 Tage Pilotphase, danach Abo wählen. Keine automatische Verlängerung.",
    };
  }
  return {
    headline: "NIS2-Struktur aufbauen",
    cta: "Jetzt vollständige NIS2-Compliance herstellen",
    subline: "Dokumente, Maßnahmen und Audit-Ordner aus einer Hand.",
  };
}

export function getResultPageCtas(score: number): {
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
} {
  const strong = score >= STRONG_OFFER_THRESHOLD;
  return {
    primary: strong
      ? { label: "Pilot starten — 499 € einmalig", href: "/upgrade?offer=pilot" }
      : { label: "Jetzt vollständige NIS2-Compliance herstellen", href: "/register?redirect=/upgrade" },
    secondary: { label: "Erst Demo ansehen", href: "/demo" },
  };
}
