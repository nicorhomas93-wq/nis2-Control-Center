import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-brand-600" />
          <div>
            <p className="text-sm font-bold text-slate-900">TKND</p>
            <p className="text-xs text-slate-500">NIS2 Control Center</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <Link href="/demo" className="hover:text-brand-600">Demo</Link>
          <Link href="/pricing" className="hover:text-brand-600">Preise</Link>
          <Link href="/legal" className="hover:text-brand-600">Rechtliches</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">Anmelden</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">NIS2-Check starten</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
