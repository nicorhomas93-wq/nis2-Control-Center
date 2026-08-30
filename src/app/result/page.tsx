import { ResultPageClient } from "@/components/funnel/ResultPageClient";

export const metadata = {
  title: "Ihr NIS2-Ergebnis",
  robots: { index: false, follow: false },
};

export default function ResultPage() {
  return <ResultPageClient />;
}
