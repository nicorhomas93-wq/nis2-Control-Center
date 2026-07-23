"use client";

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  colorClassName?: string;
  trackClassName?: string;
  label?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 9,
  colorClassName = "text-brand-600",
  trackClassName = "text-slate-100",
  label,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={trackClassName}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          className={`animate-ring ${colorClassName}`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ "--ring-circumference": circumference } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {label ?? <span className="text-xl font-bold tabular-nums text-slate-900">{clamped}%</span>}
      </div>
    </div>
  );
}
