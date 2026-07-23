import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

const tones = {
  brand: { icon: "bg-brand-50 text-brand-600", ring: "ring-brand-100" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", ring: "ring-emerald-100" },
  amber: { icon: "bg-amber-50 text-amber-600", ring: "ring-amber-100" },
  red: { icon: "bg-red-50 text-red-600", ring: "ring-red-100" },
  slate: { icon: "bg-slate-100 text-slate-600", ring: "ring-slate-200" },
} as const;

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: keyof typeof tones;
  delay?: number;
  className?: string;
  valueClassName?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "brand",
  delay = 0,
  className,
  valueClassName,
}: StatCardProps) {
  const t = tones[tone];
  return (
    <Card
      interactive
      className={cn("animate-fade-in-up p-5", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg ring-1", t.icon, t.ring)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold tabular-nums text-slate-900", valueClassName)}>
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
    </Card>
  );
}
