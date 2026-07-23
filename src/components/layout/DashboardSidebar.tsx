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

// Each nav item gets its own soft pastel identity color when active.
// "/incidents" is the one deliberate exception to the otherwise subtle glow —
// a security incident deserves to read as more urgent than the rest.
const NAV_TONES: Record<string, { hex: string; critical?: boolean }> = {
  "/dashboard": { hex: "#60a5fa" },
  "/mandanten": { hex: "#a78bfa" },
  "/company": { hex: "#818cf8" },
  "/assessment": { hex: "#2dd4bf" },
  "/documents": { hex: "#38bdf8" },
  "/lieferanten": { hex: "#fbbf24" },
  "/schulungen": { hex: "#f472b6" },
  "/fragebogen": { hex: "#22d3ee" },
  "/risks": { hex: "#fb7185" },
  "/measures": { hex: "#34d399" },
  "/aufgaben": { hex: "#fb923c" },
  "/incidents": { hex: "#f87171", critical: true },
  "/audit": { hex: "#c084fc" },
  "/integrationen": { hex: "#94a3b8" },
  "/jarvis": { hex: "#e879f9" },
  "/owner": { hex: "#94a3b8" },
  "/settings": { hex: "#94a3b8" },
};
const DEFAULT_TONE = { hex: "#60a5fa" };

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
          const tone = NAV_TONES[href] ?? DEFAULT_TONE;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              style={
                active
                  ? {
                      background: `linear-gradient(90deg, ${hexToRgba(tone.hex, 0.22)}, ${hexToRgba(tone.hex, 0.05)})`,
                      boxShadow: `0 0 ${tone.critical ? 18 : 10}px 0 ${hexToRgba(
                        tone.hex,
                        tone.critical ? 0.4 : 0.18
                      )}`,
                    }
                  : undefined
              }
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active ? "text-white" : "text-slate-300 hover:translate-x-1 hover:bg-slate-800 hover:text-white"
              )}
            >
              {active && (
                <>
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: tone.hex }}
                  />
                  <span
                    aria-hidden
                    className="absolute right-1 top-1/2 h-4 w-2.5 -translate-y-1/2 [clip-path:polygon(0_0,100%_50%,0_100%)]"
                    style={{
                      backgroundColor: tone.hex,
                      filter: `drop-shadow(0 0 ${tone.critical ? 7 : 4}px ${hexToRgba(
                        tone.hex,
                        tone.critical ? 0.85 : 0.6
                      )})`,
                    }}
                  />
                </>
              )}
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
                  active ? "scale-110" : "scale-100"
                )}
                style={active ? { backgroundColor: hexToRgba(tone.hex, 0.18) } : undefined}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0 transition-colors duration-200", !active && "text-slate-400 group-hover:text-white")}
                  style={active ? { color: tone.hex } : undefined}
                />
              </span>
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
