import { DemoPageClient } from "@/components/demo/DemoPageClient";

export const metadata = {
  title: "Live-Demo ansehen",
  description:
    "Sehen Sie TKND NIS2 Control Center live mit Beispieldaten: Sicherheitsstatus, Risikoanalyse, Maßnahmen und Audit-Nachweise am Beispiel MusterTech GmbH.",
  keywords: ["NIS2 Software Demo", "NIS2 Tool testen"],
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return <DemoPageClient />;
}
