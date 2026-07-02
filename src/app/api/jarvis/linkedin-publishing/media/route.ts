import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  const access = await requireJarvisApiAccess();
  if (!access.ok) return access.response;

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei erforderlich" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Nur PNG, JPEG oder WebP erlaubt" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Bild darf maximal 5 MB groß sein" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${access.userId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from("linkedin-media")
    .upload(path, buffer, { upsert: false, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: getDbErrorMessage(uploadError) }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("linkedin-media").getPublicUrl(path);

  return NextResponse.json({
    image_url: `${publicUrl}?v=${Date.now()}`,
    image_storage_path: path,
  });
}
