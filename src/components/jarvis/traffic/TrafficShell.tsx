"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  FileText,
  LayoutDashboard,
  Megaphone,
  Search,
  Send,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TRAFFIC_DISCLAIMER } from "@/lib/jarvis/traffic/constants";

const trafficTabs = [
  { href: "/jarvis/traffic", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/jarvis/traffic/target-groups", label: "Zielgruppen", icon: Target },
  { href: "/jarvis/traffic/search-profiles", label: "Suchprofile", icon: Search },
  { href: "/jarvis/traffic/b2b-outreach", label: "B2B Outreach", icon: Users },
  { href: "/jarvis/traffic/outreach", label: "Outreach", icon: Send },
  { href: "/jarvis/traffic/content-ideas", label: "Content-Ideen", icon: FileText },
  { href: "/jarvis/traffic/campaigns", label: "Kampagnen", icon: Megaphone },
  { href: "/jarvis/traffic/weekly-plan", label: "Wochenplan", icon: Calendar },
];

export function TrafficShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
        <p className="text-sm font-medium text-sky-900">Traffic Jarvis</p>
        <p className="mt-1 text-xs text-sky-800">{TRAFFIC_DISCLAIMER}</p>
      </div>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {trafficTabs.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-sky-600 text-sky-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
