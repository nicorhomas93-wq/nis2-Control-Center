"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  CheckCircle2,
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  ThumbsDown,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LINKEDIN_CAMPAIGN_DISCLAIMER } from "@/lib/jarvis/kampagnen/constants";

const kampagnenTabs = [
  { href: "/jarvis/kampagnen", label: "Übersicht", icon: LayoutDashboard, view: "overview" },
  { href: "/jarvis/kampagnen?view=aktiv", label: "Aktive Kampagnen", icon: Megaphone, view: "aktiv" },
  {
    href: "/jarvis/kampagnen?view=abgeschlossen",
    label: "Abgeschlossen",
    icon: CheckCircle2,
    view: "abgeschlossen",
  },
  { href: "/jarvis/kampagnen?view=antworten", label: "Antworten", icon: MessageSquare, view: "antworten" },
  { href: "/jarvis/kampagnen?view=demos", label: "Demos", icon: CalendarCheck, view: "demos" },
  { href: "/jarvis/kampagnen?view=gewonnen", label: "Gewonnen", icon: Trophy, view: "gewonnen" },
  { href: "/jarvis/kampagnen?view=verloren", label: "Verloren", icon: ThumbsDown, view: "verloren" },
];

export function KampagnenShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? "overview";
  const isDetail = pathname !== "/jarvis/kampagnen";

  return (
    <div>
      <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
        <p className="text-sm font-medium text-violet-900">LinkedIn Kampagnenmanager</p>
        <p className="mt-1 text-xs text-violet-800">{LINKEDIN_CAMPAIGN_DISCLAIMER}</p>
      </div>

      {!isDetail && (
        <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
          {kampagnenTabs.map(({ href, label, icon: Icon, view }) => {
            const active = currentView === view;
            return (
              <Link
                key={view}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      )}

      {isDetail && (
        <div className="mb-4">
          <Link
            href="/jarvis/kampagnen"
            className="text-sm text-violet-700 hover:underline"
          >
            ← Zurück zur Kampagnen-Übersicht
          </Link>
        </div>
      )}

      {children}
    </div>
  );
}
