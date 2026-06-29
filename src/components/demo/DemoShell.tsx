import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Demo-Modus</strong> – Beispieldaten (MusterTech GmbH), keine echte Prüfung.
          </span>
        </div>
        <Link
          href="/register"
          className="text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          Echten Zugang starten →
        </Link>
      </div>
    </div>
  );
}

export function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <DemoBanner />
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-bold">TKND NIS2 Control Center</p>
            <p className="text-xs text-slate-400">Demo – MusterTech GmbH</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Zur Startseite
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
