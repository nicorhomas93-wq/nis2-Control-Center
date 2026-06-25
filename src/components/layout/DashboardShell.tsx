import { DashboardSidebar } from "./DashboardSidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 pt-16 lg:px-6 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
