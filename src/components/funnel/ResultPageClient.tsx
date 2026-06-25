"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, FileWarning, Mail } from "lucide-react";
import { FunnelLayout } from "@/components/funnel/FunnelLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { loadFunnelResult } from "@/lib/funnel/storage";
import { getResultPageCtas, getStrongOfferCta } from "@/lib/acquisition/conversion-engine";
import { captureEmail, trackAcquisition, trackCtaClick } from "@/lib/acquisition/client";
import type { FunnelCheckResult } from "@/lib/funnel/types";

const riskItems = [
  "Keine vollständige Dokumentation",
  "Unklare Maßnahmen",
  "Kein prüfbarer Status",
];

function resultBadgeClass(level: FunnelCheckResult["level"]): string {
  if (level === "high") return "bg-red-100 text-red-800";
  if (level === "partial") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

export function ResultPageClient() {
  const router = useRouter();
  const [result, setResult] = useState<FunnelCheckResult | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [acquisitionScore, setAcquisitionScore] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const data = loadFunnelResult();
    if (!data) {
      router.replace("/check");
      return;
    }
    setResult(data);
    setAcquisitionScore(data.score);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: auth }) => {
      if (auth.user) setIsLoggedIn(true);
    });
  }, [router]);

  if (!result) {
    return (
      <FunnelLayout>
        <p className="text-center text-slate-500">Ergebnis wird geladen…</p>
      </FunnelLayout>
    );
  }

  const ctas = getResultPageCtas(acquisitionScore);
  const strongOffer = getStrongOfferCta(acquisitionScore);
  const primaryHref = isLoggedIn
    ? ctas.primary.href.replace(/^\/register\?redirect=/, "")
    : ctas.primary.href;

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    await captureEmail(email);
    setEmailSent(true);
  }

  return (
    <FunnelLayout>
      <div className="text-center">
        <Badge className={resultBadgeClass(result.level)}>{result.label}</Badge>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Ihr NIS2-Ergebnis</h1>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-center text-lg font-medium leading-relaxed text-slate-800">
          {result.problemFrame}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-950">Ihr aktuelles Risiko</h2>
        <ul className="mt-4 space-y-2">
          {riskItems.map((text) => (
            <li key={text} className="flex items-center gap-2 text-sm text-amber-950">
              <FileWarning className="h-4 w-4 shrink-0 text-amber-600" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <Clock className="h-5 w-5 shrink-0 text-red-600" />
        <p className="text-sm font-semibold text-red-900">
          Im Ernstfall bleiben 72 Stunden zur Meldung.
        </p>
      </div>

      {acquisitionScore >= 60 && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-semibold text-brand-900">{strongOffer.headline}</p>
          <p className="mt-1 text-xs text-brand-800">{strongOffer.subline}</p>
        </div>
      )}

      <form onSubmit={handleEmailSubmit} className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Mail className="h-4 w-4" />
          Ergebnis per E-Mail erhalten
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ihre@firma.de"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <Button type="submit" size="sm" disabled={emailSent}>
            {emailSent ? "Gesendet" : "Senden"}
          </Button>
        </div>
      </form>

      <div className="mt-10 space-y-3">
        <Link
          href={primaryHref}
          className="block"
          onClick={() => {
            trackCtaClick("result_primary");
            void trackAcquisition("upgrade_click", { pagePath: "/result" });
          }}
        >
          <Button size="lg" className="w-full">
            {ctas.primary.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link
          href={ctas.secondary.href}
          className="block"
          onClick={() => trackCtaClick("result_demo")}
        >
          <Button variant="outline" size="lg" className="w-full">
            {ctas.secondary.label}
          </Button>
        </Link>
      </div>
    </FunnelLayout>
  );
}
