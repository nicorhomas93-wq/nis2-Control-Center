"use client";

import { ACQUISITION_VISITOR_COOKIE, type AcquisitionEventType, type UtmParams } from "@/lib/acquisition/types";

const VISITOR_STORAGE_KEY = "tknd_vid";

function generateVisitorId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_STORAGE_KEY);
  if (!id) {
    id = generateVisitorId();
    localStorage.setItem(VISITOR_STORAGE_KEY, id);
  }
  document.cookie = `${ACQUISITION_VISITOR_COOKIE}=${id};path=/;max-age=31536000;SameSite=Lax`;
  return id;
}

export function parseUtmFromUrl(): UtmParams {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
    utm_content: params.get("utm_content") ?? undefined,
  };
}

export async function trackAcquisition(
  eventType: AcquisitionEventType,
  options?: { pagePath?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  const visitorId = getOrCreateVisitorId();
  if (!visitorId) return;

  const utm = parseUtmFromUrl();
  const pagePath = options?.pagePath ?? window.location.pathname;

  try {
    await fetch("/api/acquisition/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        eventType,
        pagePath,
        metadata: options?.metadata,
        utm,
      }),
      keepalive: eventType === "page_leave",
    });
  } catch {
    // Tracking darf UX nicht blockieren
  }
}

export async function submitCheckComplete(
  funnelResult: Record<string, unknown>,
  email?: string
): Promise<{ leadId: string | null; score: number; strongOffer: boolean }> {
  const visitorId = getOrCreateVisitorId();
  const utm = parseUtmFromUrl();

  const res = await fetch("/api/acquisition/check-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, funnelResult, email, utm }),
  });

  if (!res.ok) return { leadId: null, score: 0, strongOffer: false };
  return res.json();
}

export async function captureEmail(email: string, acquisitionLeadId?: string): Promise<void> {
  const visitorId = getOrCreateVisitorId();
  await fetch("/api/acquisition/capture-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, email, acquisitionLeadId }),
  });
}

export function trackCtaClick(ctaId: string): void {
  void trackAcquisition("cta_click", { metadata: { ctaId } });
}
