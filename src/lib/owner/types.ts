export type OwnerEntityType =
  | "company"
  | "mandant"
  | "risk"
  | "measure"
  | "document"
  | "incident"
  | "audit_export";

export interface SoftDeleteFields {
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
}

export interface TrashItem {
  id: string;
  entityType: OwnerEntityType;
  title: string;
  companyId: string | null;
  companyName: string;
  deletedAt: string;
  deletedBy: string | null;
  deletionReason: string | null;
}

export const OWNER_DELETE_DENIED = "Keine Berechtigung zum Löschen.";

export const ENTITY_TYPE_LABELS: Record<OwnerEntityType, string> = {
  company: "Unternehmen",
  mandant: "Mandant",
  risk: "Risiko",
  measure: "Maßnahme",
  document: "Dokument",
  incident: "Sicherheitsvorfall",
  audit_export: "Audit-Export",
};

export const CRITICAL_ENTITY_TYPES: OwnerEntityType[] = ["company", "mandant"];

export function getDependencyWarning(entityType: OwnerEntityType): string | null {
  if (entityType === "company" || entityType === "mandant") {
    return "Alle zugehörigen Risiken, Maßnahmen, Dokumente, Sicherheitsvorfälle, Audit-Exporte, Scores und Events werden in den Papierkorb verschoben.";
  }
  return null;
}
