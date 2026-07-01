"use client";

import type { Incident } from "@/lib/types";
import {
  formatIncidentApiError,
  parseIncidentApiResponse,
} from "@/lib/incidents/errors";
import type { IncidentFormState } from "@/lib/incidents/types";
import { formStateToPayload } from "@/lib/incidents/types";

export interface IncidentSaveContext {
  incidentId: string;
  companyId: string;
  form: IncidentFormState;
  extraFields?: Record<string, unknown>;
}

export interface IncidentSaveResult {
  ok: boolean;
  incident?: Incident;
  warning?: string | null;
  errorMessage?: string;
  validationErrors?: string[];
  debug?: {
    status: number;
    body: Record<string, unknown>;
    payload: Record<string, unknown>;
  };
}

export async function saveIncidentToApi(
  context: IncidentSaveContext
): Promise<IncidentSaveResult> {
  const { incidentId, companyId, form, extraFields } = context;

  if (!incidentId) {
    return {
      ok: false,
      errorMessage: "Speichern fehlgeschlagen: Keine Vorfall-ID — bitte Vorfall zuerst anlegen.",
    };
  }

  const payload: Record<string, unknown> = {
    id: incidentId,
    company_id: companyId,
    ...formStateToPayload(form),
    ...extraFields,
  };

  console.log("Saving incident started");
  console.log("Incident form data:", form);
  console.log("Incident id:", incidentId);
  console.log("Incident save payload:", payload);

  try {
    const res = await fetch("/api/incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const { body, rawText } = await parseIncidentApiResponse(res);

    if (!res.ok) {
      const validationErrors = Array.isArray(body.validation_errors)
        ? body.validation_errors.map(String)
        : [];
      const errorMessage = formatIncidentApiError(res, body, rawText);

      console.error("Incident save failed:", {
        error: body.error ?? body,
        message: body.message,
        details: body.details,
        hint: body.hint,
        code: body.code,
        status: res.status,
        payload,
        incidentId,
        companyId,
        rawText: rawText?.slice(0, 500),
      });

      return {
        ok: false,
        errorMessage,
        validationErrors,
        debug: { status: res.status, body, payload },
      };
    }

    console.log("Incident saved:", body.incident);

    return {
      ok: true,
      incident: body.incident as Incident,
      warning: typeof body.warning === "string" ? body.warning : null,
      debug: { status: res.status, body, payload },
    };
  } catch (error) {
    console.error("Incident save failed:", {
      error,
      payload,
      incidentId,
      companyId,
    });

    const message =
      error instanceof Error
        ? `Speichern fehlgeschlagen: ${error.message}`
        : "Speichern fehlgeschlagen: Netzwerk- oder Verbindungsfehler";

    return { ok: false, errorMessage: message };
  }
}
