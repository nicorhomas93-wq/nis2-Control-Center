import Link from "next/link";
import { Shield } from "lucide-react";
import { AuthNavActions } from "@/components/auth/AuthNavActions";

interface FunnelLayoutProps {
  children: React.ReactNode;
  step?: number;
  totalSteps?: number;
  showProgress?: boolean;
}

export function FunnelLayout({
  children,
  step,
  totalSteps = 4,
  showProgress = false,
}: FunnelLayoutProps) {
  const progress = step && totalSteps ? Math.round((step / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex min-w-0 shrink items-center gap-2">
            <Shield className="h-6 w-6 shrink-0 text-brand-600" />
            <span className="truncate text-sm font-bold text-slate-900">TKND NIS2</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <AuthNavActions />
            {showProgress && step ? (
              <span className="hidden text-xs font-medium text-slate-500 sm:inline">
                Schritt {step} von {totalSteps}
              </span>
            ) : null}
          </div>
        </div>
        {showProgress && step ? (
          <div className="h-1 bg-slate-100">
            <div
              className="h-1 bg-brand-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
