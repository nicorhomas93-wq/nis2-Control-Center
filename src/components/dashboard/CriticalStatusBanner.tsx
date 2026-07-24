import Link from "next/link";
import { AlertOctagon, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CriticalItem {
  id: string;
  label: string;
  detail: string;
  href: string;
}

interface CriticalStatusBannerProps {
  items: CriticalItem[];
}

/**
 * The one thing on the dashboard that must never be missed: a single,
 * always-at-the-top summary of every already-computed critical signal
 * (security level, overdue mandatory obligations, critical team tasks, own
 * overdue tasks), each linking straight to where it needs to be fixed.
 * Renders a calm all-clear state when nothing is critical, so the absence
 * of danger is communicated just as clearly as its presence.
 */
export function CriticalStatusBanner({ items }: CriticalStatusBannerProps) {
  const hasCritical = items.length > 0;

  if (!hasCritical) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <p className="text-sm font-medium text-emerald-900">
          Alles im grünen Bereich — aktuell keine kritischen Punkte offen.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-6 overflow-hidden rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-white shadow-lg shadow-red-500/15"
      )}
    >
      <div className="flex items-center gap-3 border-b border-red-200 bg-red-100/60 px-5 py-3">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
          <AlertOctagon className="h-4 w-4" />
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
        </span>
        <div>
          <p className="text-sm font-bold text-red-900">
            {items.length === 1 ? "1 kritischer Punkt" : `${items.length} kritische Punkte`} — jetzt handeln
          </p>
        </div>
      </div>
      <ul className="divide-y divide-red-100">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-red-50"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{item.label}</p>
                <p className="truncate text-xs text-slate-600">{item.detail}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-red-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
