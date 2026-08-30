import { Suspense } from "react";
import type { Metadata } from "next";
import { PricingPageClient } from "@/components/marketing/PricingPageClient";

export const metadata: Metadata = {
  title: "Preise",
  description:
    "NIS2-Compliance-Software zum planbaren Preis: Live-Sicherheitsstatus, automatische Risikoanalyse, Audit-Nachweise und Pflichtdokumente. Jetzt Preise vergleichen.",
  keywords: ["NIS2 Software Preis", "NIS2 Tool kaufen", "NIS2 Compliance Kosten"],
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <PricingPageClient />
    </Suspense>
  );
}
