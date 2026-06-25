import { PILOT_NOTIFICATION_EMAIL } from "@/lib/app-config";

function parseAdminEmails(): string[] {
  const fromEnv = process.env.JARVIS_ADMIN_EMAILS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return [PILOT_NOTIFICATION_EMAIL.toLowerCase()];
}

/**
 * Plattform-Owner/Admin (TKND) — kein Kundenabo, kein Pilot-Plan.
 * Zugang über JARVIS_ADMIN_EMAILS oder Rolle admin/owner.
 */
export function isPlatformOwner(
  email: string | null | undefined,
  role?: string | null
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (role === "admin" || role === "owner") return true;
  return parseAdminEmails().includes(normalized);
}

/** @alias isPlatformOwner */
export const canAccessJarvis = isPlatformOwner;

export function isPilotPlanWithoutPayment(company: {
  plan?: string | null;
  subscription_status?: string | null;
} | null): boolean {
  if (!company) return false;
  const plan = company.plan ?? "free";
  const status = company.subscription_status ?? "inactive";
  return plan === "pilot" && status !== "active" && status !== "trialing" && status !== "past_due";
}
