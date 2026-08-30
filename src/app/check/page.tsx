import { CheckFlowClient } from "@/components/funnel/CheckFlowClient";

export const metadata = {
  title: "Kostenloser NIS2-Schnellcheck",
  description:
    "Kostenloser NIS2-Schnellcheck: Prüfen Sie in 2 Minuten, ob Ihr Unternehmen von der NIS2-Richtlinie betroffen ist – ohne Anmeldung, sofortiges Ergebnis.",
  keywords: ["NIS2 Betroffenheitsprüfung", "NIS2 Check", "bin ich von NIS2 betroffen"],
  alternates: { canonical: "/check" },
};

export default function CheckPage() {
  return <CheckFlowClient />;
}
