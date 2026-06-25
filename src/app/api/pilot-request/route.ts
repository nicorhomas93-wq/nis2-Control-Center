import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { PILOT_CONTACT_EMAIL } from "@/lib/app-config";
import { notifyPilotRequest, getPilotEmailUserHint } from "@/lib/pilot/notify-pilot-request";
import {
  savePilotRequestLocally,
  type PilotRequestInput,
} from "@/lib/pilot/pilot-request-store";

async function finalizePilotRequest(
  payload: PilotRequestInput,
  stored: "database" | "local"
) {
  const mail = await notifyPilotRequest(payload);

  return NextResponse.json({
    success: true,
    stored,
    emailSent: mail.sent,
    emailMethod: mail.method,
    emailError: mail.error,
    hint: !mail.sent ? getPilotEmailUserHint(mail.error) : undefined,
    localNote:
      stored === "local" ? "Zusätzlich lokal gespeichert (data/pilot-requests.jsonl)." : undefined,
  });
}

function buildPayload(body: Record<string, unknown>): PilotRequestInput | null {
  const name = String(body.name ?? "").trim();
  const company = String(body.company ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!name || !company || !email) return null;

  return {
    name,
    company,
    email,
    phone: body.phone ? String(body.phone).trim() || null : null,
    industry: body.industry ? String(body.industry).trim() || null : null,
    message: body.message ? String(body.message).trim() || null : null,
  };
}

async function insertViaSupabase(payload: PilotRequestInput) {
  const admin = createAdminClient();
  const client = admin ?? (await createClient());

  return client.from("pilot_requests").insert(payload);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const payload = buildPayload(body);
  if (!payload) {
    return NextResponse.json(
      { error: "Name, Unternehmen und E-Mail sind erforderlich." },
      { status: 400 }
    );
  }

  const { error } = await insertViaSupabase(payload);

  if (!error) {
    return finalizePilotRequest(payload, "database");
  }

  const missingTable = isMissingTableError(error);
  const isRlsError =
    error.code === "42501" ||
    error.message?.toLowerCase().includes("row-level security");

  if (missingTable || isRlsError || process.env.NODE_ENV === "development") {
    try {
      await savePilotRequestLocally(payload);
      return finalizePilotRequest(payload, "local");
    } catch (localError) {
      console.error("Pilot request local fallback failed:", localError);
    }
  }

  if (missingTable) {
    return NextResponse.json(
      {
        error: getDbErrorMessage(error),
        fallback: true,
        contact: PILOT_CONTACT_EMAIL,
        setupHint: "supabase/migrations/add_pilot_requests_and_plan.sql",
      },
      { status: 503 }
    );
  }

  console.error("Pilot request insert failed:", error);

  return NextResponse.json(
    {
      error: error.message ?? "Anfrage konnte nicht gespeichert werden.",
      fallback: true,
      contact: PILOT_CONTACT_EMAIL,
    },
    { status: 500 }
  );
}
