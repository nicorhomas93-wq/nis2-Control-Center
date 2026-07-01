import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyRole } from "@/lib/team/types";

export interface InvitationByToken {
  id: string;
  company_id: string;
  email: string;
  role: CompanyRole;
  token: string;
  status: string;
  invited_by: string | null;
  expires_at: string;
  company_name: string | null;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function resolveCompanyName(companies: unknown): string | null {
  if (Array.isArray(companies)) {
    return (companies[0] as { company_name?: string } | undefined)?.company_name ?? null;
  }
  return (companies as { company_name?: string } | null)?.company_name ?? null;
}

export async function getInvitationByToken(
  token: string
): Promise<InvitationByToken | null> {
  const admin = createAdminClient();
  if (!admin || !token.trim()) return null;

  const { data } = await admin
    .from("company_invitations")
    .select("id, company_id, email, role, token, status, invited_by, expires_at, companies(company_name)")
    .eq("token", token.trim())
    .eq("status", "invited")
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    company_id: data.company_id,
    email: data.email,
    role: data.role as CompanyRole,
    token: data.token,
    status: data.status,
    invited_by: data.invited_by,
    expires_at: data.expires_at,
    company_name: resolveCompanyName(data.companies),
  };
}

export async function markInvitationExpired(invitationId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await admin
    .from("company_invitations")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("id", invitationId);
}

export async function acceptInvitation(options: {
  invitation: InvitationByToken;
  userId: string;
  userEmail: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; code?: "email_mismatch" | "expired" }> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Einladung konnte nicht verarbeitet werden." };
  }

  if (!options.userEmail?.trim()) {
    return {
      ok: false,
      error: "Ihr Konto hat keine E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.",
      code: "email_mismatch",
    };
  }

  if (normalizeEmail(options.userEmail) !== normalizeEmail(options.invitation.email)) {
    return {
      ok: false,
      error: `Diese Einladung gilt für ${options.invitation.email}. Sie sind als ${options.userEmail} angemeldet.`,
      code: "email_mismatch",
    };
  }

  if (new Date(options.invitation.expires_at) < new Date()) {
    await markInvitationExpired(options.invitation.id);
    return { ok: false, error: "Diese Einladung ist abgelaufen.", code: "expired" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("id", options.userId)
    .maybeSingle();

  if (!profile) {
    await admin.from("profiles").insert({
      id: options.userId,
      email: normalizeEmail(options.userEmail),
    });
  } else if (!profile.email) {
    await admin
      .from("profiles")
      .update({ email: normalizeEmail(options.userEmail) })
      .eq("id", options.userId);
  }

  const { error: memberError } = await admin.from("company_members").upsert(
    {
      company_id: options.invitation.company_id,
      user_id: options.userId,
      role: options.invitation.role,
      active: true,
      invited_by: options.invitation.invited_by,
    },
    { onConflict: "company_id,user_id" }
  );

  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  const { error: inviteError } = await admin
    .from("company_invitations")
    .update({
      status: "active",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", options.invitation.id);

  if (inviteError) {
    return { ok: false, error: inviteError.message };
  }

  await admin
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", options.userId);

  return { ok: true };
}
