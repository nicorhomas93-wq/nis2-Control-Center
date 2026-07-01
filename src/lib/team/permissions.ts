import type { CompanyRole } from "@/lib/team/types";

export type Permission =
  | "company.read"
  | "company.write"
  | "users.manage"
  | "users.invite"
  | "users.deactivate"
  | "mandanten.manage"
  | "white_label.manage"
  | "data.delete_permanent"
  | "data.soft_delete"
  | "risks.write"
  | "measures.write"
  | "documents.write"
  | "incidents.write"
  | "evidence.write"
  | "tasks.read_all"
  | "tasks.read_own"
  | "tasks.write"
  | "tasks.assign"
  | "tasks.complete_own"
  | "audit.read"
  | "reports.read"
  | "measures.approve"
  | "comments.write";

const ROLE_PERMISSIONS: Record<CompanyRole, Permission[]> = {
  owner: [
    "company.read",
    "company.write",
    "users.manage",
    "users.invite",
    "users.deactivate",
    "mandanten.manage",
    "white_label.manage",
    "data.delete_permanent",
    "data.soft_delete",
    "risks.write",
    "measures.write",
    "documents.write",
    "incidents.write",
    "evidence.write",
    "tasks.read_all",
    "tasks.write",
    "tasks.assign",
    "tasks.complete_own",
    "audit.read",
    "reports.read",
    "measures.approve",
    "comments.write",
  ],
  admin: [
    "company.read",
    "company.write",
    "users.invite",
    "users.deactivate",
    "data.soft_delete",
    "risks.write",
    "measures.write",
    "documents.write",
    "incidents.write",
    "evidence.write",
    "tasks.read_all",
    "tasks.write",
    "tasks.assign",
    "tasks.complete_own",
    "audit.read",
    "reports.read",
    "measures.approve",
    "comments.write",
  ],
  it_responsible: [
    "company.read",
    "risks.write",
    "measures.write",
    "incidents.write",
    "evidence.write",
    "tasks.read_all",
    "tasks.write",
    "tasks.complete_own",
    "audit.read",
    "comments.write",
  ],
  management: [
    "company.read",
    "tasks.read_all",
    "audit.read",
    "reports.read",
    "measures.approve",
    "comments.write",
  ],
  employee: ["company.read", "tasks.read_own", "tasks.complete_own", "evidence.write", "comments.write"],
  auditor: ["company.read", "audit.read", "reports.read", "tasks.read_all"],
};

export function hasPermission(role: CompanyRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageUsers(role: CompanyRole): boolean {
  return hasPermission(role, "users.manage") || hasPermission(role, "users.invite");
}

export function isReadOnlyRole(role: CompanyRole): boolean {
  return role === "auditor";
}

export function roleRank(role: CompanyRole): number {
  const order: CompanyRole[] = [
    "owner",
    "admin",
    "it_responsible",
    "management",
    "employee",
    "auditor",
  ];
  return order.indexOf(role);
}
