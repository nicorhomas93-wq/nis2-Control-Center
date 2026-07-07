"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Building2,
  ClipboardCheck,
  ClipboardList,
  ListChecks,
  FileText,
  FolderArchive,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Plug,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import { performLogout } from "@/lib/auth/logout";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { canAccessJarvis, isPlatformOwner } from "@/lib/jarvis/access";
import { canUseFeature } from "@/lib/billingAccess";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/SidebarContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mandanten", label: "Meine Mandanten", icon: Users, consultantOnly: true },
  { href: "/company", label: "Unternehmen", icon: Building2 },
  { href: "/assessment", label: "Betroffenheitscheck", icon: ShieldCheck },
  { href: "/documents", label: "Dokumente", icon: FileText },
  { href: "/lieferanten", label: "Lieferanten & Dienstleister", icon: Truck },
  { href: "/schulungen", label: "Schulungen & Nachweise", icon: GraduationCap },
  { href: "/fragebogen", label: "Fragebögen", icon: ClipboardList },
  { href: "/risks", label: "Risikoanalyse", icon: ShieldAlert },
  { href: "/measures", label: "Maßnahmen", icon: ClipboardCheck },
  { href: "/aufgaben", label: "Aufgaben", icon: ListChecks },
  { href: "/incidents", label: "Sicherheitsvorfall", icon: AlertTriangle },
  { href: "/audit", label: "Audit-Ordner", icon: FolderArchive },
  { href: "/integrationen", label: "Integrationen", icon: Plug },
  { href: "/jarvis", label: "Jarvis Sales", icon: Bot },
  { href: "/owner", label: "Owner-Verwaltung", icon: Trash2, ownerOnly: true },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];

function SidebarPanel({
  onNavigate,
  showClose,
  onClose,
  visibleNavItems,
  pathname,
  onLogout,
  loggingOut,
}: {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  visibleNavItems: typeof navItems;
  pathname: string;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <>
      <div className="border-b border-slate-800 px-6 py-5">
        <div className="flex items-start justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
            <BrandLogo variant="sidebar" />
          </Link>
          {showClose && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:text-white md:hidden"
              aria-label="Menü schließen"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800 p-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          aria-label="Abmelden"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {loggingOut ? "Abmelden…" : "Abmelden"}
        </button>
      </div>
    </>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { mobileOpen, closeMobile } = useSidebar();
  const [showJarvis, setShowJarvis] = useState(false);
  const [showMandanten, setShowMandanten] = useState(false);
  const [showOwner, setShowOwner] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) {
        setShowJarvis(false);
        setShowMandanten(false);
        setShowOwner(false);
        return;
      }
      const [{ data: profile }, { data: company }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle(),
        supabase
          .from("companies")
          .select("plan, access_enabled, pilot_setup_paid_at, subscription_status")
          .eq("user_id", data.user.id)
          .eq("is_mandant", false)
          .maybeSingle(),
      ]);
      setShowJarvis(canAccessJarvis(data.user.email, profile?.role));
      setShowOwner(isPlatformOwner(data.user.email, profile?.role));
      setShowMandanten(
        canUseFeature(company as Company | null, "multi_tenant", canAccessJarvis(data.user.email, profile?.role))
      );
    });
  }, []);

  const visibleNavItems = navItems.filter((item) => {
    if (item.href === "/jarvis" && !showJarvis) return false;
    if (item.ownerOnly && !showOwner) return false;
    if (item.consultantOnly && !showMandanten) return false;
    return true;
  });

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    closeMobile();
    await performLogout();
  }

  const panelProps = {
    visibleNavItems,
    pathname,
    onLogout: handleLogout,
    loggingOut,
    onNavigate: closeMobile,
  };

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-white transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!mobileOpen}
      >
        <SidebarPanel {...panelProps} showClose onClose={closeMobile} />
      </aside>

      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-white md:flex">
        <SidebarPanel {...panelProps} />
      </aside>
    </>
  );
}
