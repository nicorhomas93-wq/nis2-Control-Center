"use client";

import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { BrandingProvider } from "@/components/layout/BrandingProvider";
import type { ResolvedBranding } from "@/lib/white-label/types";

interface DashboardShellClientProps {
  children: React.ReactNode;
  branding: ResolvedBranding;
}

export function DashboardShellClient({ children, branding }: DashboardShellClientProps) {
  return (
    <BrandingProvider branding={branding}>
      <SidebarProvider>
        <div className="flex min-h-screen bg-slate-50">
          <DashboardSidebar />

          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <MobileHeader />

            <div className="no-print hidden items-center justify-end border-b border-slate-200 bg-white px-6 py-2 md:flex">
              <NotificationBell />
            </div>

            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </BrandingProvider>
  );
}
