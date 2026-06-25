import Link from "next/link";
import { Shield } from "lucide-react";

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
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-brand-600" />
            <span className="text-sm font-bold text-slate-900">TKND NIS2</span>
          </Link>
          {showProgress && step ? (
            <span className="text-xs font-medium text-slate-500">
              Schritt {step} von {totalSteps}
            </span>
          ) : null}
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
      <main className="mx-auto max-w-2xl px-6 py-10">{children}</main>
    </div>
  );
}
