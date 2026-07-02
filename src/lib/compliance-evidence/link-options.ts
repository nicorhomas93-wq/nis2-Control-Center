import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceLinkOptions } from "@/components/compliance-evidence/EvidenceLinkFields";
import { activeOnly } from "@/lib/supabase/soft-delete";
import { AUDIT_FOLDERS } from "@/lib/audit/audit-folders";

export async function loadEvidenceLinkOptions(
  supabase: SupabaseClient,
  companyId: string
): Promise<EvidenceLinkOptions> {
  const [risksRes, measuresRes, tasksRes, incidentsRes, vendorsRes] = await Promise.all([
    activeOnly(
      supabase.from("risks").select("id, asset, threat").eq("company_id", companyId)
    ),
    activeOnly(
      supabase.from("measures").select("id, title").eq("company_id", companyId)
    ),
    supabase
      .from("task_items")
      .select("id, title")
      .eq("company_id", companyId)
      .is("deleted_at", null),
    activeOnly(
      supabase.from("incidents").select("id, title, incident_type").eq("company_id", companyId)
    ),
    activeOnly(
      supabase
        .from("company_vendors")
        .select("id, name")
        .eq("company_id", companyId)
    ),
  ]);

  return {
    risks: (risksRes.data ?? []).map((r) => ({
      id: r.id,
      label: r.asset || r.threat || r.id,
    })),
    measures: (measuresRes.data ?? []).map((m) => ({
      id: m.id,
      label: m.title || m.id,
    })),
    tasks: (tasksRes.data ?? []).map((t) => ({
      id: t.id,
      label: t.title || t.id,
    })),
    incidents: (incidentsRes.data ?? []).map((i) => ({
      id: i.id,
      label: i.title || i.incident_type || i.id,
    })),
    vendors: (vendorsRes.data ?? []).map((v) => ({
      id: v.id,
      label: v.name || v.id,
    })),
    auditAreas: AUDIT_FOLDERS.map((f) => ({
      id: f.folderName,
      label: f.label,
    })),
  };
}
