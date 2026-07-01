"use client";

import { createContext, useContext, useMemo } from "react";
import type { ResolvedBranding } from "@/lib/white-label/types";
import { brandingCssVariables } from "@/lib/white-label/colors";

const BrandingContext = createContext<ResolvedBranding | null>(null);

export function BrandingProvider({
  branding,
  children,
}: {
  branding: ResolvedBranding;
  children: React.ReactNode;
}) {
  const cssVars = useMemo(() => {
    if (!branding.active) return null;
    return brandingCssVariables({
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      accent: branding.accentColor,
    });
  }, [branding]);

  const styleContent = cssVars
    ? `:root { ${Object.entries(cssVars)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ")}; }`
    : null;

  return (
    <BrandingContext.Provider value={branding}>
      {styleContent ? <style id="white-label-theme">{styleContent}</style> : null}
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): ResolvedBranding {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return ctx;
}

export function useBrandingOptional(): ResolvedBranding | null {
  return useContext(BrandingContext);
}
