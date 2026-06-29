import { DashboardSidebar } from "./DashboardSidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-nowrap bg-slate-50">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl py-8 px-6 pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
