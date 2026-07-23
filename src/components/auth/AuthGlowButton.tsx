"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthGlowButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Submit button with a slow-rotating conic-gradient ring bleeding through a
 * rounded mask, restyled in brand blue/teal from a neon-cyan/pink reference.
 * The ring speeds up and the button grows slightly on hover — the "hover
 * expanding" part of the reference — while staying inside a fixed-size
 * wrapper so surrounding layout never shifts.
 */
export function AuthGlowButton({ children, loading, disabled, className }: AuthGlowButtonProps) {
  return (
    <div className={cn("group relative overflow-hidden rounded-lg p-[2px]", className)}>
      <span
        aria-hidden
        className="auth-glow-ring animate-spin-slow absolute -inset-[60%] rounded-full opacity-70 blur-md transition-[opacity] duration-300 group-hover:opacity-100 group-hover:[animation-duration:2.5s]"
      />
      <button
        type="submit"
        disabled={disabled}
        className={cn(
          "relative flex w-full items-center justify-center gap-2 rounded-[7px] bg-gradient-to-b from-brand-500 to-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition-all duration-300 ease-out",
          "group-hover:-translate-y-0.5 group-hover:scale-[1.02] group-hover:shadow-glow-brand",
          "active:translate-y-0 active:scale-100",
          "disabled:cursor-not-allowed disabled:opacity-70 disabled:group-hover:translate-y-0 disabled:group-hover:scale-100"
        )}
      >
        {children}
        {!loading && <Lock className="h-3.5 w-3.5 opacity-80" />}
      </button>
    </div>
  );
}
