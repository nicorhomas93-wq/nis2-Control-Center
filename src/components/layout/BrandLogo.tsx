"use client";

import Image from "next/image";
import { Shield } from "lucide-react";
import { useBrandingOptional } from "@/components/layout/BrandingProvider";
import { DEFAULT_BRANDING } from "@/lib/white-label/types";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  variant?: "sidebar" | "header";
  className?: string;
}

export function BrandLogo({ variant = "sidebar", className }: BrandLogoProps) {
  const branding = useBrandingOptional() ?? DEFAULT_BRANDING;
  const isSidebar = variant === "sidebar";

  const iconClass = isSidebar ? "h-6 w-6 text-brand-400" : "h-6 w-6 text-brand-600";
  const titleClass = isSidebar
    ? "text-sm font-bold leading-tight"
    : "truncate text-sm font-bold text-slate-900";
  const subtitleClass = isSidebar
    ? "text-xs text-slate-400"
    : "truncate text-xs text-slate-500";

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      {branding.active && branding.logoUrl ? (
        <Image
          src={branding.logoUrl}
          alt={branding.displayName}
          width={isSidebar ? 28 : 24}
          height={isSidebar ? 28 : 24}
          className="h-7 w-7 shrink-0 object-contain"
          unoptimized
        />
      ) : (
        <Shield className={cn("shrink-0", iconClass)} />
      )}
      <div className="min-w-0">
        <p className={titleClass}>{branding.displayName}</p>
        <p className={subtitleClass}>{branding.tagline}</p>
      </div>
    </div>
  );
}
