import { CheckFlowClient } from "@/components/funnel/CheckFlowClient";

export const metadata = {
  title: "NIS2-Schnellcheck | TKND NIS2 Control Center",
  description: "Prüfen Sie in 2 Minuten Ihre NIS2-Betroffenheit.",
};

export default function CheckPage() {
  return <CheckFlowClient />;
}
