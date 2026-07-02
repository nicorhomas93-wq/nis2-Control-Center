import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership } from "@/lib/company";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import {
  archivePreviousFileVersions,
  getNextFileVersion,
} from "@/lib/compliance-evidence/service";
import { deriveEntryStatus } from "@/lib/compliance-evidence/scoring";
import { syncAndReturnComplianceSnapshot } from "@/lib/compliance/sync";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/png",
  "image/jpeg",
  "text/plain",
  "application/zip",
  "application/octet-stream",
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: entryId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const form = await request.formData();
  const companyId = form.get("companyId");
  const file = form.get("file");

  if (typeof companyId !== "string" || !companyId) {
    return NextResponse.json({ error: "companyId erforderlich" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  const { data: entry } = await supabase
    .from("compliance_evidence_entries")
    .select("*")
    .eq("id", entryId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (!entry) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Datei darf maximal 25 MB groß sein." }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(mime)) {
    return NextResponse.json(
      { error: "Dateityp nicht erlaubt. Erlaubt: PDF, DOCX, XLSX, CSV, PNG, JPG, TXT, ZIP." },
      { status: 400 }
    );
  }

  const safeName = sanitizeFileName(file.name);
  const version = await getNextFileVersion(supabase, entryId, safeName);
  await archivePreviousFileVersions(supabase, entryId, safeName);

  const storagePath = `${companyId}/${entryId}/v${version}_${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("compliance-evidence")
    .upload(storagePath, buffer, { upsert: false, contentType: mime });

  if (uploadError) {
    return NextResponse.json({ error: getDbErrorMessage(uploadError) }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("compliance-evidence")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const { data: fileRow, error: fileError } = await supabase
    .from("compliance_evidence_files")
    .insert({
      entry_id: entryId,
      company_id: companyId,
      file_name: safeName,
      file_type: mime,
      file_size: file.size,
      storage_path: storagePath,
      file_url: signed?.signedUrl ?? null,
      version,
      is_current: true,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (fileError) {
    return NextResponse.json(
      { error: getDbErrorMessage(fileError), missingTable: isMissingTableError(fileError) },
      { status: isMissingTableError(fileError) ? 503 : 500 }
    );
  }

  const { data: allFiles } = await supabase
    .from("compliance_evidence_files")
    .select("*")
    .eq("entry_id", entryId)
    .eq("is_current", true);

  const computedStatus = deriveEntryStatus(
    entry,
    (allFiles ?? []) as import("@/lib/compliance-evidence/types").ComplianceEvidenceFile[],
    company
  );

  await supabase
    .from("compliance_evidence_entries")
    .update({ status: computedStatus })
    .eq("id", entryId);

  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return NextResponse.json({ file: fileRow, status: computedStatus, snapshot });
}
