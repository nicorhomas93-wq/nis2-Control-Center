export interface SupabaseErrorShape {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function normalizeSupabaseError(error: unknown): SupabaseErrorShape {
  if (!error || typeof error !== "object") {
    return { message: typeof error === "string" ? error : "Unbekannter Fehler" };
  }
  const e = error as SupabaseErrorShape;
  return {
    message: e.message,
    code: e.code,
    details: e.details,
    hint: e.hint,
  };
}

export function formatSupabaseError(error: unknown): string {
  const e = normalizeSupabaseError(error);
  const parts: string[] = [];
  if (e.message) parts.push(e.message);
  if (e.details) parts.push(e.details);
  if (e.hint) parts.push(`Hinweis: ${e.hint}`);
  if (e.code) parts.push(`Code: ${e.code}`);
  return parts.join(" — ") || "Unbekannter Datenbankfehler";
}

export function formatIncidentApiError(
  response: Response,
  body: Record<string, unknown> | null,
  rawText?: string
): string {
  const parts: string[] = [];

  if (Array.isArray(body?.validation_errors) && body.validation_errors.length > 0) {
    parts.push(body.validation_errors.map(String).join(" "));
  }

  if (typeof body?.error === "string" && body.error.trim()) {
    parts.push(body.error);
  } else if (body?.error && typeof body.error === "object") {
    parts.push(formatSupabaseError(body.error));
  }

  if (typeof body?.message === "string" && body.message.trim()) {
    parts.push(body.message);
  }
  if (typeof body?.hint === "string" && body.hint.trim()) {
    parts.push(`Hinweis: ${body.hint}`);
  }
  if (typeof body?.details === "string" && body.details.trim()) {
    parts.push(body.details);
  } else if (body?.details && typeof body.details === "object") {
    parts.push(formatSupabaseError(body.details));
  }
  if (typeof body?.code === "string" && body.code.trim()) {
    parts.push(`Code: ${body.code}`);
  }

  if (parts.length === 0 && rawText?.trim()) {
    parts.push(rawText.trim().slice(0, 300));
  }

  parts.push(`HTTP ${response.status}`);

  const detail = parts.filter(Boolean).join(" — ");
  return detail ? `Speichern fehlgeschlagen: ${detail}` : `Speichern fehlgeschlagen (HTTP ${response.status})`;
}

export async function parseIncidentApiResponse(response: Response): Promise<{
  body: Record<string, unknown>;
  rawText: string;
}> {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return { body: {}, rawText };
  }
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    return { body: parsed ?? {}, rawText };
  } catch {
    return { body: {}, rawText };
  }
}
