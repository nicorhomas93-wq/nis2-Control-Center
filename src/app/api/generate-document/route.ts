import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCompanyOwnership, isCompanyProfileComplete } from "@/lib/company";
import {
  buildDocumentPrompt,
  generateFallbackDocument,
  generateWithAI,
} from "@/lib/ai/generate";
import { finalizeDocumentContent, type GenerationMode } from "@/lib/documents/generation-mode";
import { saveGeneratedDocument } from "@/lib/documents/save-document";
import { syncCompanySecurityScore } from "@/lib/compliance/sync";
import { getDocumentTypeLabel } from "@/lib/nis2/document-types";
import type { Document, DocumentType } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { companyId, documentType } = await request.json();

  if (!companyId || !documentType) {
    return NextResponse.json({ error: "companyId und documentType erforderlich" }, { status: 400 });
  }

  const company = await verifyCompanyOwnership(user.id, companyId);
  if (!company) return NextResponse.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

  if (!isCompanyProfileComplete(company)) {
    return NextResponse.json(
      {
        error: "Bitte vervollständigen Sie zuerst das Unternehmensprofil unter „Unternehmen“.",
        needsProfile: true,
      },
      { status: 400 }
    );
  }

  const prompt = buildDocumentPrompt(company, documentType);
  const aiContent = await generateWithAI(prompt);
  const mode: GenerationMode = aiContent ? "openai" : "demo";
  const rawContent = aiContent ?? generateFallbackDocument(company, documentType);
  const content = finalizeDocumentContent(rawContent, mode);
  const typeLabel = getDocumentTypeLabel(documentType);

  const { data: existing } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("document_type", documentType)
    .maybeSingle();

  const result = await saveGeneratedDocument(supabase, {
    companyId,
    documentType: documentType as DocumentType,
    typeLabel,
    content,
    mode,
    existing: (existing as Document) ?? null,
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message, missingTable: result.error.missingTable },
      { status: result.error.missingTable ? 503 : 500 }
    );
  }

  await syncCompanySecurityScore(supabase, companyId);

  return NextResponse.json({
    document: result.document,
    mode,
    demoMode: mode === "demo",
  });
}
