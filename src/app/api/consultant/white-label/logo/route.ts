import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import {
  canManageWhiteLabel,
  getConsultantSettings,
  settingsToBranding,
} from "@/lib/white-label/branding";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function POST(request: Request) {
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

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei erforderlich." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Nur PNG, JPEG, WebP oder SVG erlaubt." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Logo darf maximal 2 MB groß sein." }, { status: 400 });
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/webp"
          ? "webp"
          : "svg";

  const path = `${user.id}/${access.companyId}/logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("branding-logos")
    .upload(path, buffer, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error("Logo upload failed:", uploadError);
    return NextResponse.json({ error: getDbErrorMessage(uploadError) }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("branding-logos").getPublicUrl(path);

  const logoUrl = `${publicUrl}?v=${Date.now()}`;
  const { settings: existing } = await getConsultantSettings(access.companyId);

  const { data, error } = await supabase
    .from("consultant_settings")
    .upsert(
      {
        company_id: access.companyId,
        white_label_enabled: existing?.white_label_enabled ?? false,
        logo_url: logoUrl,
        display_name: existing?.display_name ?? null,
        primary_color: existing?.primary_color ?? "#2563eb",
        secondary_color: existing?.secondary_color ?? "#dbeafe",
        accent_color: existing?.accent_color ?? "#60a5fa",
        email_sender_name: existing?.email_sender_name ?? null,
        support_email: existing?.support_email ?? null,
        custom_domain: existing?.custom_domain ?? null,
      },
      { onConflict: "company_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  return NextResponse.json({
    logo_url: logoUrl,
    settings: data,
    branding: settingsToBranding(data),
    success: true,
  });
}
