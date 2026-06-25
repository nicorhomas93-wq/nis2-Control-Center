import Link from "next/link";
import { PILOT_CONTACT_EMAIL } from "@/lib/app-config";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">TKND NIS2 Control Center</p>
            <p className="mt-1 text-sm text-slate-500">
              Struktur, Dokumentation und Nachweisführung für NIS2.
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm text-slate-600">
            <Link href="/pricing" className="hover:text-brand-600">
              Preise
            </Link>
            <Link href="/demo" className="hover:text-brand-600">
              Demo
            </Link>
            <Link href="/legal" className="hover:text-brand-600">
              Rechtliche Hinweise
            </Link>
            <a href={`mailto:${PILOT_CONTACT_EMAIL}`} className="hover:text-brand-600">
              Kontakt
            </a>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} TKND NIS2 Control Center · Keine Rechtsberatung
        </p>
      </div>
    </footer>
  );
}
