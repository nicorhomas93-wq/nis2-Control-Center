const PROBLEM_WORD_PATTERN =
  /\b(fehlend(?:e|er|es|en)?|unzureichend(?:e|er|es|en)?|mangelnd(?:e|er|es|en)?)\b/i;

export const MEASURE_PROBLEM_WARNING =
  "Maßnahme ist kein konkreter Handlungsschritt. Bitte formulieren Sie eine umsetzbare Aktion.";

export function validateMeasureTitle(title: string): {
  valid: boolean;
  warning: string | null;
} {
  const trimmed = title.trim();
  if (!trimmed) {
    return { valid: true, warning: null };
  }

  if (PROBLEM_WORD_PATTERN.test(trimmed)) {
    return { valid: false, warning: MEASURE_PROBLEM_WARNING };
  }

  return { valid: true, warning: null };
}
