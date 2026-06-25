import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => (
    <label
      htmlFor={id}
      className={cn("flex cursor-pointer items-center gap-2 text-sm text-slate-700", className)}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        {...props}
      />
      {label}
    </label>
  )
);

Checkbox.displayName = "Checkbox";
export { Checkbox };
