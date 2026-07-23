import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary:
        "bg-gradient-to-b from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 shadow-sm hover:shadow-glow-brand hover:-translate-y-1 active:translate-y-0 active:shadow-sm disabled:bg-brand-300 disabled:from-brand-300 disabled:to-brand-300 disabled:shadow-none disabled:translate-y-0",
      secondary:
        "bg-slate-800 text-white hover:bg-slate-900 shadow-sm hover:shadow-lg hover:shadow-slate-900/20 hover:-translate-y-1 active:translate-y-0 active:shadow-sm disabled:bg-slate-400 disabled:shadow-none disabled:translate-y-0",
      outline:
        "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
      ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md hover:-translate-y-1 active:translate-y-0",
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
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:hover:translate-y-0",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export { Button };
