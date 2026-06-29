import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthNavActions } from "@/components/auth/AuthNavActions";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2">
          <Shield className="h-7 w-7 shrink-0 text-brand-600" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">TKND</p>
            <p className="truncate text-xs text-slate-500">NIS2 Control Center</p>
          </div>
        </Link>

        <nav className="items-center gap-6 text-sm text-slate-600 flex">
          <Link href="/demo" className="hover:text-brand-600">
            Demo
          </Link>
          <Link href="/pricing" className="hover:text-brand-600">
            Preise
          </Link>
          <Link href="/legal" className="hover:text-brand-600">
            Rechtliches
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <AuthNavActions />
          <Link href="/check" className="shrink-0">
            <Button size="sm" className="whitespace-nowrap">
              NIS2-Check starten
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
