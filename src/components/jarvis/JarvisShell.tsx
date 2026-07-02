"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  Mail,
  Megaphone,
  PenLine,
  Settings,
  Share2,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JARVIS_DISCLAIMER } from "@/lib/jarvis/constants";

const jarvisTabs = [
  { href: "/jarvis", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/jarvis/leads", label: "Leads", icon: Users },
  { href: "/jarvis/pilot-requests", label: "Pilotanfragen", icon: Inbox },
  { href: "/jarvis/drafts", label: "E-Mail-Entwürfe", icon: Mail },
  { href: "/jarvis/follow-ups", label: "Follow-ups", icon: ClipboardList },
  { href: "/jarvis/pipeline", label: "Verkaufs-Pipeline", icon: Workflow },
  { href: "/jarvis/kampagnen", label: "Kampagnen", icon: Share2 },
  { href: "/jarvis/content-hub", label: "Content Hub", icon: PenLine },
  { href: "/jarvis/acquisition", label: "Acquisition", icon: Megaphone },
  { href: "/jarvis/traffic", label: "Traffic", icon: TrendingUp },
  { href: "/jarvis/settings", label: "Einstellungen", icon: Settings },
];

export function JarvisShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-brand-600" />
            <h1 className="text-2xl font-bold text-slate-900">Jarvis Sales</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Interner Verkaufs- und Lead-Agent — alle Aktionen werden protokolliert.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 max-w-xl">
          <FileText className="mb-1 inline h-3.5 w-3.5" /> {JARVIS_DISCLAIMER}
        </div>
      </div>

      <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {jarvisTabs.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand-600 text-brand-700"
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
