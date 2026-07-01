import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { normalizeHexColor, isValidHexColor } from "@/lib/white-label/colors";
import {
  canManageWhiteLabel,
  getConsultantSettings,
  mergeConsultantSettings,
  resolveBrandingForUser,
  settingsToBranding,
} from "@/lib/white-label/branding";
import { DEFAULT_CONSULTANT_SETTINGS } from "@/lib/white-label/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const access = await canManageWhiteLabel(user.id, user.email);
  const branding = await resolveBrandingForUser(user.id, user.email);

  if (!access.companyId) {
    return NextResponse.json({
      allowed: false,
      branding,
      settings: null,
    });
  }

  const { settings, missingTable, error } = await getConsultantSettings(access.companyId);
  if (error && !missingTable) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    allowed: access.allowed,
    companyId: access.companyId,
    settings: settings ?? { company_id: access.companyId, ...DEFAULT_CONSULTANT_SETTINGS },
    branding,
    missingTable,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const access = await canManageWhiteLabel(user.id, user.email);
  if (!access.allowed || !access.companyId) {
    return NextResponse.json(
      { error: "White-Label ist nur im Consultant-Plan verfügbar." },
      { status: 403 }
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const { settings: existing } = await getConsultantSettings(access.companyId);

  const patch: Record<string, unknown> = {};

  if (typeof body.white_label_enabled === "boolean") {
    patch.white_label_enabled = body.white_label_enabled;
  }
  if (typeof body.display_name === "string") {
    patch.display_name = body.display_name.trim() || null;
  }
  if (typeof body.logo_url === "string" || body.logo_url === null) {
    patch.logo_url = body.logo_url;
  }
  if (typeof body.email_sender_name === "string") {
    patch.email_sender_name = body.email_sender_name.trim() || null;
  }
  if (typeof body.support_email === "string") {
    patch.support_email = body.support_email.trim() || null;
  }
  if (typeof body.custom_domain === "string") {
    patch.custom_domain = body.custom_domain.trim() || null;
  }

  for (const key of ["primary_color", "secondary_color", "accent_color"] as const) {
    if (typeof body[key] === "string") {
      const color = body[key].trim();
      if (!isValidHexColor(color)) {
        return NextResponse.json({ error: `Ungültige Farbe für ${key}.` }, { status: 400 });
      }
      patch[key] = normalizeHexColor(color, DEFAULT_CONSULTANT_SETTINGS[key]!);
    }
  }

  const merged = mergeConsultantSettings(access.companyId, existing, patch);

  const { data, error } = await supabase
    .from("consultant_settings")
    .upsert(merged, { onConflict: "company_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: isMissingTableError(error) ? 503 : 500 }
    );
  }

  const branding = settingsToBranding(data);

  return NextResponse.json({ settings: data, branding, success: true });
}
