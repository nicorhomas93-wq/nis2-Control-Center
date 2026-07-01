import { Suspense } from "react";
import type { Metadata } from "next";
import { PricingPageClient } from "@/components/marketing/PricingPageClient";

export const metadata: Metadata = {
  title: "Preise | TKND NIS2 Control Center",
  description:
    "Steuern Sie Ihre NIS2-Compliance aktiv: Live Sicherheitsstatus, klare nächste Schritte und Audit-Bereitschaft.",
};

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <PricingPageClient />
    </Suspense>
  );
}
