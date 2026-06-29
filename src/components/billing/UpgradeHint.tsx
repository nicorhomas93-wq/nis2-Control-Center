import Link from "next/link";
import { Sparkles } from "lucide-react";

export function UpgradeHint({ message }: { message: string }) {
  return (
    <div className="mb-6 flex gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 flex-row items-center justify-between">
      <p className="flex items-start gap-2 text-sm text-brand-900">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
        {message}
      </p>
      <Link
        href="/pricing"
        className="shrink-0 text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
      >
        Plan upgraden →
      </Link>
    </div>
  );
}
