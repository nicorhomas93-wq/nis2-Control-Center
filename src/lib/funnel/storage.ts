import type { FunnelCheckResult } from "@/lib/funnel/types";
import { FUNNEL_STORAGE_KEY } from "@/lib/funnel/types";

export function saveFunnelResult(result: FunnelCheckResult): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FUNNEL_STORAGE_KEY, JSON.stringify(result));
}

export function loadFunnelResult(): FunnelCheckResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(FUNNEL_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FunnelCheckResult;
  } catch {
    return null;
  }
}

export function clearFunnelResult(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(FUNNEL_STORAGE_KEY);
}
