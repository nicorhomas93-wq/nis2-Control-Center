import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const SHINE_VARIANTS = new Set(["primary", "secondary", "danger"]);

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const variants = {
      primary:
        "bg-gradient-to-br from-brand-400 via-brand-600 to-brand-700 text-white hover:from-brand-500 hover:to-brand-800 shadow-sm hover:shadow-glow-brand hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] active:shadow-sm disabled:bg-brand-300 disabled:from-brand-300 disabled:to-brand-300 disabled:shadow-none disabled:translate-y-0",
      secondary:
        "bg-gradient-to-br from-slate-700 to-slate-900 text-white hover:from-slate-800 hover:to-black shadow-sm hover:shadow-lg hover:shadow-slate-900/20 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] active:shadow-sm disabled:bg-slate-400 disabled:shadow-none disabled:translate-y-0",
      outline:
        "border border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50/60 hover:text-brand-700 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98]",
      ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]",
      danger:
        "bg-gradient-to-br from-red-500 to-red-700 text-white hover:from-red-600 hover:to-red-800 shadow-sm hover:shadow-md hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg font-medium transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:hover:translate-y-0",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
        {SHINE_VARIANTS.has(variant) && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
          />
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
