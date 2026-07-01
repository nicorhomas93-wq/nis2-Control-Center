"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useSidebar } from "@/components/layout/SidebarContext";

export function MobileHeader() {
  const { openMobile } = useSidebar();

  return (
    <header className="no-print flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
      <button
        type="button"
        onClick={openMobile}
        className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
        aria-label="Menü öffnen"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2">
        <BrandLogo variant="header" />
      </Link>
      <NotificationBell />
    </header>
  );
}
