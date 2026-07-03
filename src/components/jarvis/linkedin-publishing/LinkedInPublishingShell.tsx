"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const VIEWS = [
  { key: "overview", label: "Übersicht" },
  { key: "drafts", label: "Entwürfe" },
  { key: "pending", label: "Zur Freigabe" },
  { key: "approved", label: "Freigegeben" },
  { key: "scheduled", label: "Geplant" },
  { key: "published", label: "Veröffentlicht" },
  { key: "create", label: "Erstellen" },
  { key: "import", label: "Content Hub" },
] as const;

export function LinkedInPublishingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "overview";

  return (
    <div>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-100 pb-px">
        {VIEWS.map(({ key, label }) => {
          const href = key === "overview" ? pathname : `${pathname}?view=${key}`;
          const active = view === key || (key === "overview" && !searchParams.get("view"));
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
