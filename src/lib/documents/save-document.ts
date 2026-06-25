import type { SupabaseClient } from "@supabase/supabase-js";
import { getDbErrorMessage, isMissingColumnError, isMissingTableError } from "@/lib/supabase/db-error";
import type { Document, DocumentType } from "@/lib/types";
import type { GenerationMode } from "@/lib/documents/generation-mode";

type SaveResult =
  | { document: Document; error: null }
  | { document: null; error: { message: string; missingTable: boolean } };

export async function saveGeneratedDocument(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    documentType: DocumentType;
    typeLabel: string;
    content: string;
    mode: GenerationMode;
    existing: Document | null;
  }
): Promise<SaveResult> {
  const { companyId, documentType, typeLabel, content, mode, existing } = params;

  const baseFields = {
    content,
    title: typeLabel,
    status: "published" as const,
  };

  if (existing) {
    const newVersion = (existing.version ?? 1) + 1;
    const payloads = [
      { ...baseFields, version: newVersion, generation_mode: mode },
      { ...baseFields, version: newVersion },
      { ...baseFields },
    ];

    for (const payload of payloads) {
      const { data, error } = await supabase
        .from("documents")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();

      if (!error && data) {
        return {
          document: { ...(data as Document), generation_mode: mode, version: newVersion },
          error: null,
        };
      }

      if (error && !isMissingColumnError(error)) {
        return {
          document: null,
          error: {
            message: getDbErrorMessage(error),
            missingTable: isMissingTableError(error),
          },
        };
      }
    }

    return {
      document: null,
      error: { message: getDbErrorMessage(null), missingTable: false },
    };
  }

  const payloads = [
    {
      company_id: companyId,
      document_type: documentType,
      ...baseFields,
      version: 1,
      generation_mode: mode,
    },
    {
      company_id: companyId,
      document_type: documentType,
      ...baseFields,
      version: 1,
    },
    {
      company_id: companyId,
      document_type: documentType,
      ...baseFields,
    },
  ];

  for (const payload of payloads) {
    const { data, error } = await supabase.from("documents").insert(payload).select().single();

    if (!error && data) {
      return {
        document: { ...(data as Document), generation_mode: mode, version: 1 },
        error: null,
      };
    }

    if (error && !isMissingColumnError(error)) {
      return {
        document: null,
        error: {
          message: getDbErrorMessage(error),
          missingTable: isMissingTableError(error),
        },
      };
    }
  }

  return {
    document: null,
    error: { message: "Dokument konnte nicht gespeichert werden.", missingTable: false },
  };
}
