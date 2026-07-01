import type { SupabaseClient } from "@supabase/supabase-js";
import type { OwnerEntityType, TrashItem } from "@/lib/owner/types";
import { ENTITY_TYPE_LABELS } from "@/lib/owner/types";

const COMPANY_CHILD_TABLES = [
  "risks",
  "measures",
  "documents",
  "incidents",
  "audit_exports",
  "nis2_assessments",
  "company_assets",
  "compliance_events",
  "security_score_snapshots",
] as const;

function deletePatch(userId: string, reason?: string | null) {
  return {
    deleted_at: new Date().toISOString(),
    deleted_by: userId,
    deletion_reason: reason ?? null,
  };
}

function restorePatch() {
  return {
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
  };
}

async function verifyCompanyAccess(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function getEntityCompanyId(
  supabase: SupabaseClient,
  entityType: OwnerEntityType,
  entityId: string
): Promise<string | null> {
  if (entityType === "company" || entityType === "mandant") return entityId;

  const table =
    entityType === "audit_export"
      ? "audit_exports"
      : entityType === "risk"
        ? "risks"
        : entityType === "measure"
          ? "measures"
          : entityType === "document"
            ? "documents"
            : "incidents";

  const { data } = await supabase.from(table).select("company_id").eq("id", entityId).maybeSingle();
  return (data as { company_id?: string } | null)?.company_id ?? null;
}

async function softDeleteCompanyChildren(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  reason?: string | null
) {
  const patch = deletePatch(userId, reason);
  for (const table of COMPANY_CHILD_TABLES) {
    await supabase
      .from(table)
      .update(patch)
      .eq("company_id", companyId)
      .is("deleted_at", null);
  }
}

async function restoreCompanyChildren(supabase: SupabaseClient, companyId: string) {
  const patch = restorePatch();
  for (const table of COMPANY_CHILD_TABLES) {
    await supabase.from(table).update(patch).eq("company_id", companyId).not("deleted_at", "is", null);
  }
}

export async function softDeleteEntity(
  supabase: SupabaseClient,
  userId: string,
  entityType: OwnerEntityType,
  entityId: string,
  reason?: string | null
): Promise<{ error: string | null }> {
  const companyId = await getEntityCompanyId(supabase, entityType, entityId);
  if (!companyId) return { error: "Eintrag nicht gefunden." };

  const allowed = await verifyCompanyAccess(supabase, userId, companyId);
  if (!allowed) return { error: "Keine Berechtigung zum Löschen." };

  const patch = deletePatch(userId, reason);

  if (entityType === "company" || entityType === "mandant") {
    await softDeleteCompanyChildren(supabase, companyId, userId, reason);
    const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
    return { error: error?.message ?? null };
  }

  const table =
    entityType === "audit_export"
      ? "audit_exports"
      : entityType === "risk"
        ? "risks"
        : entityType === "measure"
          ? "measures"
          : entityType === "document"
            ? "documents"
            : "incidents";

  const { error } = await supabase.from(table).update(patch).eq("id", entityId);
  return { error: error?.message ?? null };
}

export async function restoreEntity(
  supabase: SupabaseClient,
  userId: string,
  entityType: OwnerEntityType,
  entityId: string,
  restoreRelated = false
): Promise<{ error: string | null }> {
  const companyId = await getEntityCompanyId(supabase, entityType, entityId);
  if (!companyId) return { error: "Eintrag nicht gefunden." };

  const allowed = await verifyCompanyAccess(supabase, userId, companyId);
  if (!allowed) return { error: "Keine Berechtigung." };

  const patch = restorePatch();

  if (entityType === "company" || entityType === "mandant") {
    const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
    if (error) return { error: error.message };
    if (restoreRelated) {
      await restoreCompanyChildren(supabase, companyId);
    }
    return { error: null };
  }

  const table =
    entityType === "audit_export"
      ? "audit_exports"
      : entityType === "risk"
        ? "risks"
        : entityType === "measure"
          ? "measures"
          : entityType === "document"
            ? "documents"
            : "incidents";

  const { error } = await supabase.from(table).update(patch).eq("id", entityId);
  return { error: error?.message ?? null };
}

export async function hardDeleteEntity(
  supabase: SupabaseClient,
  userId: string,
  entityType: OwnerEntityType,
  entityId: string
): Promise<{ error: string | null }> {
  const companyId = await getEntityCompanyId(supabase, entityType, entityId);
  if (!companyId) return { error: "Eintrag nicht gefunden." };

  const allowed = await verifyCompanyAccess(supabase, userId, companyId);
  if (!allowed) return { error: "Keine Berechtigung." };

  if (entityType === "company" || entityType === "mandant") {
    for (const table of COMPANY_CHILD_TABLES) {
      await supabase.from(table).delete().eq("company_id", companyId);
    }
    const { error } = await supabase.from("companies").delete().eq("id", companyId);
    return { error: error?.message ?? null };
  }

  const table =
    entityType === "audit_export"
      ? "audit_exports"
      : entityType === "risk"
        ? "risks"
        : entityType === "measure"
          ? "measures"
          : entityType === "document"
            ? "documents"
            : "incidents";

  const { error } = await supabase.from(table).delete().eq("id", entityId);
  return { error: error?.message ?? null };
}

export async function listTrashItems(
  supabase: SupabaseClient,
  userId: string
): Promise<TrashItem[]> {
  const { data: companies } = await supabase
    .from("companies")
    .select("id, company_name, is_mandant, deleted_at, deleted_by, deletion_reason")
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  const companyMap = new Map<string, string>();
  const items: TrashItem[] = [];

  for (const c of companies ?? []) {
    companyMap.set(c.id, c.company_name ?? "Unbenannt");
    items.push({
      id: c.id,
      entityType: c.is_mandant ? "mandant" : "company",
      title: c.company_name ?? "Unbenannt",
      companyId: c.id,
      companyName: c.company_name ?? "Unbenannt",
      deletedAt: c.deleted_at,
      deletedBy: c.deleted_by,
      deletionReason: c.deletion_reason,
    });
  }

  const { data: ownedCompanies } = await supabase
    .from("companies")
    .select("id, company_name")
    .eq("user_id", userId);

  for (const co of ownedCompanies ?? []) {
    companyMap.set(co.id, co.company_name ?? "Unbenannt");
  }

  const childQueries: Array<{
    table: "risks" | "measures" | "documents" | "incidents" | "audit_exports";
    type: OwnerEntityType;
    getTitle: (row: Record<string, string | null>) => string;
  }> = [
    {
      table: "risks",
      type: "risk",
      getTitle: (r) => `${r.asset ?? "Risiko"}: ${r.threat ?? ""}`.trim(),
    },
    {
      table: "measures",
      type: "measure",
      getTitle: (r) => r.title ?? ENTITY_TYPE_LABELS.measure,
    },
    {
      table: "documents",
      type: "document",
      getTitle: (r) => r.title ?? ENTITY_TYPE_LABELS.document,
    },
    {
      table: "incidents",
      type: "incident",
      getTitle: (r) => r.title ?? ENTITY_TYPE_LABELS.incident,
    },
    {
      table: "audit_exports",
      type: "audit_export",
      getTitle: (r) => `Audit-Export ${formatShortId(r.id)}`,
    },
  ];

  for (const q of childQueries) {
    const companyIds = [...companyMap.keys()];
    if (companyIds.length === 0) continue;

    const { data } = await supabase
      .from(q.table)
      .select("id, company_id, title, asset, threat, deleted_at, deleted_by, deletion_reason")
      .in("company_id", companyIds)
      .not("deleted_at", "is", null);

    for (const row of data ?? []) {
      const r = row as Record<string, string | null>;
      items.push({
        id: r.id!,
        entityType: q.type,
        title: q.getTitle(r),
        companyId: r.company_id,
        companyName: companyMap.get(r.company_id!) ?? "—",
        deletedAt: r.deleted_at!,
        deletedBy: r.deleted_by,
        deletionReason: r.deletion_reason,
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );
}

function formatShortId(id: string | null | undefined): string {
  if (!id) return "";
  return id.slice(0, 8);
}

export async function cleanupTestData(
  supabase: SupabaseClient,
  userId: string
): Promise<{ deleted: number; error: string | null }> {
  const { data: testCompanies } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .eq("is_demo", true)
    .is("deleted_at", null);

  let deleted = 0;
  for (const company of testCompanies ?? []) {
    const result = await softDeleteEntity(supabase, userId, "company", company.id, "test_data");
    if (!result.error) deleted += 1;
  }

  return { deleted, error: null };
}
