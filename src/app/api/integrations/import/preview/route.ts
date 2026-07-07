import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCsvFlexible, requiredFieldsForImport } from "@/lib/integrations/csv-import";
import type { CsvImportType } from "@/lib/integrations/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const importType = String(form.get("importType") ?? "") as CsvImportType;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  }
  if (!importType) {
    return NextResponse.json({ error: "importType fehlt" }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".csv")) {
    return NextResponse.json(
      {
        error:
          "Aktuell ist CSV sofort nutzbar. Excel (.xlsx) ist vorbereitet, aber noch nicht aktiviert.",
      },
      { status: 400 }
    );
  }

  const raw = await file.text();
  const rows = parseCsvFlexible(raw);
  if (!rows.length) return NextResponse.json({ error: "Datei enthält keine Daten" }, { status: 400 });

  const headers = Object.keys(rows[0]);
  const required = requiredFieldsForImport(importType);
  const missingRequired = required.filter((field) => !headers.includes(field));

  return NextResponse.json({
    importType,
    fileName: file.name,
    headers,
    requiredFields: required,
    missingRequired,
    previewRows: rows.slice(0, 10),
    allRows: rows,
    totalRows: rows.length,
  });
}
