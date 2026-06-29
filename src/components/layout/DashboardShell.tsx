import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { SidebarProvider } from "@/components/layout/SidebarContext";

/**
 * Zentrales App-Layout für alle authentifizierten Bereiche.
 * Desktop: feste Sidebar links. Mobile: Drawer + MobileHeader.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <MobileHeader />

          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
