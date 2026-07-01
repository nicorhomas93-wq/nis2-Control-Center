const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(value: string | null | undefined): boolean {
  if (!value) return false;
  return HEX_RE.test(value.trim());
}

export function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  const v = value?.trim() ?? "";
  return isValidHexColor(v) ? v.toLowerCase() : fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  weight: number
): string {
  const w = Math.min(1, Math.max(0, weight));
  const r = Math.round(a.r * (1 - w) + b.r * w);
  const g = Math.round(a.g * (1 - w) + b.g * w);
  const bl = Math.round(a.b * (1 - w) + b.b * w);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Erzeugt CSS-Variablen für brand-* aus Primär-/Sekundär-/Akzentfarbe */
export function brandingCssVariables(input: {
  primary: string;
  secondary: string;
  accent: string;
}): Record<string, string> {
  const primary = normalizeHexColor(input.primary, "#2563eb");
  const secondary = normalizeHexColor(input.secondary, "#dbeafe");
  const accent = normalizeHexColor(input.accent, "#60a5fa");

  const primaryRgb = hexToRgb(primary);
  const white = { r: 255, g: 255, b: 255 };

  return {
    "--brand-50": mixRgb(white, primaryRgb, 0.06),
    "--brand-100": secondary,
    "--brand-400": accent,
    "--brand-500": mixRgb(primaryRgb, white, 0.15),
    "--brand-600": primary,
    "--brand-700": mixRgb(primaryRgb, { r: 0, g: 0, b: 0 }, 0.2),
  };
}
