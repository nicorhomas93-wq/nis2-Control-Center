"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CONTENT_HUB_AREA_LABELS, type ContentHubArea } from "@/lib/jarvis/content-hub/constants";

const AREAS: Array<{ key: ContentHubArea | "all"; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "linkedin_posts", label: CONTENT_HUB_AREA_LABELS.linkedin_posts },
  { key: "articles", label: CONTENT_HUB_AREA_LABELS.articles },
  { key: "polls", label: CONTENT_HUB_AREA_LABELS.polls },
  { key: "audit_tips", label: CONTENT_HUB_AREA_LABELS.audit_tips },
  { key: "nis2_myths", label: CONTENT_HUB_AREA_LABELS.nis2_myths },
  { key: "mini_cases", label: CONTENT_HUB_AREA_LABELS.mini_cases },
  { key: "industry", label: CONTENT_HUB_AREA_LABELS.industry },
  { key: "campaign_series", label: CONTENT_HUB_AREA_LABELS.campaign_series },
  { key: "success_stories", label: CONTENT_HUB_AREA_LABELS.success_stories },
  { key: "ceo_content", label: CONTENT_HUB_AREA_LABELS.ceo_content },
];

export function ContentHubShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const area = searchParams.get("area") ?? "all";

  return (
    <div>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-100 pb-px">
        {AREAS.map(({ key, label }) => {
          const href =
            key === "all" ? pathname : `${pathname}?area=${key}`;
          const active = area === key || (key === "all" && !searchParams.get("area"));
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
