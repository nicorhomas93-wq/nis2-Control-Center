import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthNavActions } from "@/components/auth/AuthNavActions";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2">
          <Shield className="h-7 w-7 shrink-0 text-brand-600" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">TKND</p>
            <p className="truncate text-xs text-slate-500">NIS2 Control Center</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <Link
            href="/demo"
            className="relative py-1 transition-colors hover:text-brand-600 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-brand-600 after:transition-all after:duration-200 hover:after:w-full"
          >
            Demo
          </Link>
          <Link
            href="/pricing"
            className="relative py-1 transition-colors hover:text-brand-600 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-brand-600 after:transition-all after:duration-200 hover:after:w-full"
          >
            Preise
          </Link>
          <Link
            href="/legal"
            className="relative py-1 transition-colors hover:text-brand-600 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-brand-600 after:transition-all after:duration-200 hover:after:w-full"
          >
            Rechtliches
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <AuthNavActions />
          <Link href="/check" className="shrink-0">
            <Button size="sm" className="whitespace-nowrap">
              <span className="sm:hidden">Check</span>
              <span className="hidden sm:inline">NIS2-Check starten</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
