import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { ComplianceWarning } from "@/lib/compliance/warnings";

export function ComplianceWarningsBanner({ warnings }: { warnings: ComplianceWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4">
      <div className="mb-3 flex items-center gap-2 text-red-900">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="font-semibold">Kritische Pflichtaufgaben überfällig</p>
      </div>
      <ul className="space-y-2 text-sm text-red-800">
        {warnings.map((w) => (
          <li key={w.id} className="flex flex-wrap items-baseline justify-between gap-2">
            <span>
              <strong>{w.title}</strong> — {w.detail}
            </span>
            <Link href={w.href} className="shrink-0 font-medium underline hover:no-underline">
              Jetzt bearbeiten
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
