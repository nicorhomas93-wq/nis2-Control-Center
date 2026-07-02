import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComplianceEvidenceEntry,
  ComplianceEvidenceEntryWithFiles,
  ComplianceEvidenceFile,
} from "@/lib/compliance-evidence/types";

function normalizeEntry(row: ComplianceEvidenceEntry): ComplianceEvidenceEntry {
  return {
    ...row,
    external_links: Array.isArray(row.external_links) ? row.external_links : [],
    recommended_file_labels: Array.isArray(row.recommended_file_labels)
      ? row.recommended_file_labels
      : [],
    linked_risk_ids: row.linked_risk_ids ?? [],
    linked_measure_ids: row.linked_measure_ids ?? [],
    linked_task_ids: row.linked_task_ids ?? [],
    linked_incident_ids: row.linked_incident_ids ?? [],
    linked_vendor_ids: row.linked_vendor_ids ?? [],
    linked_audit_areas: row.linked_audit_areas ?? [],
    review_interval: row.review_interval ?? "none",
    participant_count: row.participant_count ?? null,
  };
}

export async function loadComplianceEvidenceEntries(
  supabase: SupabaseClient,
  companyId: string
): Promise<ComplianceEvidenceEntryWithFiles[]> {
  const { data: entries } = await supabase
    .from("compliance_evidence_entries")
    .select("*")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (!entries?.length) return [];

  const entryIds = entries.map((e) => e.id);
  const { data: files } = await supabase
    .from("compliance_evidence_files")
    .select("*")
    .in("entry_id", entryIds)
    .order("uploaded_at", { ascending: false });

  const filesByEntry = new Map<string, ComplianceEvidenceFile[]>();
  for (const file of files ?? []) {
    const list = filesByEntry.get(file.entry_id) ?? [];
    list.push(file as ComplianceEvidenceFile);
    filesByEntry.set(file.entry_id, list);
  }

  return (entries as ComplianceEvidenceEntry[]).map((entry) => ({
    ...normalizeEntry(entry),
    files: filesByEntry.get(entry.id) ?? [],
  }));
}

export async function getNextFileVersion(
  supabase: SupabaseClient,
  entryId: string,
  fileName: string
): Promise<number> {
  const { data } = await supabase
    .from("compliance_evidence_files")
    .select("version")
    .eq("entry_id", entryId)
    .eq("file_name", fileName)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.version ?? 0) + 1;
}

export async function archivePreviousFileVersions(
  supabase: SupabaseClient,
  entryId: string,
  fileName: string
): Promise<void> {
  await supabase
    .from("compliance_evidence_files")
    .update({ is_current: false, status: "archived" })
    .eq("entry_id", entryId)
    .eq("file_name", fileName)
    .eq("is_current", true);
}
