export type ReviewInterval = "none" | "6m" | "12m" | "24m" | "custom";

export const REVIEW_INTERVAL_LABELS: Record<ReviewInterval, string> = {
  none: "Kein Review",
  "6m": "6 Monate",
  "12m": "12 Monate",
  "24m": "24 Monate",
  custom: "Benutzerdefiniert",
};

export function computeNextReviewDate(
  interval: ReviewInterval,
  fromDate?: string | Date | null,
  customDate?: string | null
): string | null {
  if (interval === "custom") return customDate ?? null;
  if (interval === "none") return null;

  const base = fromDate ? new Date(fromDate) : new Date();
  const d = new Date(base);
  if (interval === "6m") d.setMonth(d.getMonth() + 6);
  else if (interval === "12m") d.setFullYear(d.getFullYear() + 1);
  else if (interval === "24m") d.setFullYear(d.getFullYear() + 2);
  return d.toISOString();
}
