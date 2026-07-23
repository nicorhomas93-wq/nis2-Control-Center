import Link from "next/link";
import { Shield } from "lucide-react";
import { PILOT_CONTACT_EMAIL } from "@/lib/app-config";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-semibold text-slate-900">TKND NIS2 Control Center</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Struktur, Dokumentation und Nachweisführung für NIS2.
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <Link href="/pricing" className="transition-colors hover:text-brand-600">
              Preise
            </Link>
            <Link href="/demo" className="transition-colors hover:text-brand-600">
              Demo
            </Link>
            <Link href="/legal" className="transition-colors hover:text-brand-600">
              Rechtliche Hinweise
            </Link>
            <a
              href={`mailto:${PILOT_CONTACT_EMAIL}`}
              className="transition-colors hover:text-brand-600"
            >
              Kontakt
            </a>
          </nav>
        </div>
        <p className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} TKND NIS2 Control Center · Keine Rechtsberatung
        </p>
      </div>
    </footer>
  );
}
