import type { Metadata } from "next";
import { LandingPageClient } from "@/components/marketing/LandingPageClient";
import { PublicAuthRedirect } from "@/components/auth/PublicAuthRedirect";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { DEFAULT_KEYWORDS } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "NIS2-Betroffenheitsprüfung, Risikoanalyse & Dokumentation",
  description:
    "Prüfen Sie in 2 Minuten Ihre NIS2-Betroffenheit, erstellen Sie automatisch Risikoanalyse und Pflichtdokumente und sind Sie in Tagen statt Monaten audit-bereit.",
  keywords: DEFAULT_KEYWORDS,
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  await redirectIfAuthenticated("/dashboard");
  return (
    <>
      <PublicAuthRedirect redirectTo="/dashboard" />
      <LandingPageClient />
    </>
  );
}
