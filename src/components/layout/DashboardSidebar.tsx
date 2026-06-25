"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  Building2,
  ClipboardCheck,
  FileText,
  FolderArchive,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/company", label: "Unternehmen", icon: Building2 },
  { href: "/assessment", label: "Betroffenheitscheck", icon: ShieldCheck },
  { href: "/documents", label: "Dokumente", icon: FileText },
  { href: "/risks", label: "Risikoanalyse", icon: ShieldAlert },
  { href: "/measures", label: "Maßnahmen", icon: ClipboardCheck },
  { href: "/incidents", label: "Sicherheitsvorfall", icon: AlertTriangle },
  { href: "/audit", label: "Audit-Ordner", icon: FolderArchive },
  { href: "/jarvis", label: "Jarvis Sales", icon: Bot },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <>
      <div className="border-b border-slate-800 px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <Shield className="h-6 w-6 text-brand-400" />
          <div>
            <p className="text-sm font-bold leading-tight">TKND</p>
            <p className="text-xs text-slate-400">NIS2 Control Center</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
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

      <div className="border-t border-slate-800 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="no-print fixed left-4 top-4 z-40 rounded-lg bg-slate-900 p-2 text-white lg:hidden"
        aria-label="Menü öffnen"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-white transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-5 rounded p-1 text-slate-400 hover:text-white lg:hidden"
          aria-label="Menü schließen"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebar}
      </aside>
    </>
  );
}
