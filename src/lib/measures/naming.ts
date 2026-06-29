const PROBLEM_WORD_PATTERN =
  /\b(fehlend(?:e|er|es|en)?|unzureichend(?:e|er|es|en)?|mangelnd(?:e|er|es|en)?)\b/i;

export const MEASURE_PROBLEM_WARNING =
  "Diese Eingabe beschreibt ein Problem, keine Maßnahme. Bitte formulieren Sie eine konkrete Handlung.";

/** @deprecated Alias — gleicher Text wie MEASURE_PROBLEM_WARNING */
export const RISK_ASSIST_MEASURE_WARNING = MEASURE_PROBLEM_WARNING;

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
