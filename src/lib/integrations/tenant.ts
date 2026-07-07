import { verifyCompanyAccess } from "@/lib/team/access";
import { getWorkspaceCompany } from "@/lib/company";

export async function resolveTenantForUser(userId: string, tenantId?: string | null) {
  if (tenantId) {
    const access = await verifyCompanyAccess(userId, tenantId);
    if (!access) return null;
    return access.company;
  }
  const workspace = await getWorkspaceCompany(userId);
  return workspace.company;
}
