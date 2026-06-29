"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Building2,
  ClipboardCheck,
  FileText,
  FolderArchive,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { canAccessJarvis } from "@/lib/jarvis/access";
import { canUseFeature } from "@/lib/billingAccess";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mandanten", label: "Meine Mandanten", icon: Users, consultantOnly: true },
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
  const [showJarvis, setShowJarvis] = useState(false);
  const [showMandanten, setShowMandanten] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) {
        setShowJarvis(false);
        setShowMandanten(false);
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
      setShowMandanten(
        canUseFeature(company as Company | null, "multi_tenant", canAccessJarvis(data.user.email, profile?.role))
      );
    });
  }, []);

  const visibleNavItems = navItems.filter((item) => {
    if (item.href === "/jarvis" && !showJarvis) return false;
    if (item.consultantOnly && !showMandanten) return false;
    return true;
  });

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="no-print flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-white">
      <div className="border-b border-slate-800 px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-brand-400" />
          <div>
            <p className="text-sm font-bold leading-tight">TKND</p>
            <p className="text-xs text-slate-400">NIS2 Control Center</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
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
    </aside>
  );
}
