import { createClient } from "@/lib/supabase/server";
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

export function normalizeInviteToken(token: string): string {
  try {
    return decodeURIComponent(token).trim();
  } catch {
    return token.trim();
  }
}

function mapInvitationRow(row: {
  id: string;
  company_id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  invited_by: string | null;
  expires_at: string;
  company_name?: string | null;
}): InvitationByToken {
  return {
    id: row.id,
    company_id: row.company_id,
    email: row.email,
    role: row.role as CompanyRole,
    token: row.token,
    status: row.status,
    invited_by: row.invited_by,
    expires_at: row.expires_at,
    company_name: row.company_name ?? null,
  };
}

async function getInvitationByTokenRpc(token: string): Promise<InvitationByToken | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation_by_token", {
    p_token: token,
  });

  if (error || !data || typeof data !== "object") {
    return null;
  }

  const row = data as Record<string, unknown>;
  if (!row.id || !row.company_id || !row.email || !row.role || !row.token || !row.expires_at) {
    return null;
  }

  return mapInvitationRow({
    id: String(row.id),
    company_id: String(row.company_id),
    email: String(row.email),
    role: String(row.role),
    token: String(row.token),
    status: String(row.status ?? "invited"),
    invited_by: row.invited_by ? String(row.invited_by) : null,
    expires_at: String(row.expires_at),
    company_name: row.company_name ? String(row.company_name) : null,
  });
}

async function getInvitationByTokenAdmin(
  token: string,
  options?: { includeAccepted?: boolean }
): Promise<InvitationByToken | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  let query = admin
    .from("company_invitations")
    .select("id, company_id, email, role, token, status, invited_by, expires_at")
    .eq("token", token);

  if (!options?.includeAccepted) {
    query = query.eq("status", "invited");
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) return null;

  const { data: company } = await admin
    .from("companies")
    .select("company_name")
    .eq("id", data.company_id)
    .maybeSingle();

  return mapInvitationRow({
    ...data,
    company_name: company?.company_name ?? null,
  });
}

async function isActiveTeamMember(
  userId: string,
  companyId: string
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data } = await admin
    .from("company_members")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("active", true)
    .maybeSingle();

  return Boolean(data);
}

export async function getInvitationByToken(
  token: string
): Promise<InvitationByToken | null> {
  const normalized = normalizeInviteToken(token);
  if (!normalized) return null;

  const viaAdmin = await getInvitationByTokenAdmin(normalized);
  if (viaAdmin) return viaAdmin;

  return getInvitationByTokenRpc(normalized);
}

export async function getInvitationByTokenAnyStatus(
  token: string
): Promise<InvitationByToken | null> {
  const normalized = normalizeInviteToken(token);
  if (!normalized) return null;

  const viaAdmin = await getInvitationByTokenAdmin(normalized, { includeAccepted: true });
  if (viaAdmin) return viaAdmin;

  return getInvitationByToken(normalized);
}

export async function markInvitationExpired(invitationId: string): Promise<void> {
  const admin = createAdminClient();
  if (admin) {
    await admin
      .from("company_invitations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", invitationId);
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("company_invitations")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("id", invitationId);
}

type AcceptResult =
  | { ok: true }
  | { ok: false; error: string; code?: "email_mismatch" | "expired" | "not_found" };

async function acceptInvitationAdmin(options: {
  invitation: InvitationByToken;
  userId: string;
  userEmail: string | null;
}): Promise<AcceptResult | null> {
  const admin = createAdminClient();
  if (!admin) return null;

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
    return {
      ok: false,
      error: memberError.message?.trim() || "Mitgliedschaft konnte nicht angelegt werden.",
    };
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
    return {
      ok: false,
      error: inviteError.message?.trim() || "Einladung konnte nicht abgeschlossen werden.",
    };
  }

  await admin
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", options.userId);

  return { ok: true };
}

async function acceptInvitationRpc(token: string): Promise<AcceptResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_company_invitation", {
    p_token: token,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as Record<string, unknown> | null;
  if (!result || result.ok !== true) {
    const code = String(result?.error ?? "");
    if (code === "expired") {
      return { ok: false, error: "Diese Einladung ist abgelaufen.", code: "expired" };
    }
    if (code === "email_mismatch" && result) {
      const expected = String(result.expected_email ?? "die eingeladene Adresse");
      const actual = String(result.actual_email ?? "Ihre Anmeldung");
      return {
        ok: false,
        error: `Diese Einladung gilt für ${expected}. Sie sind als ${actual} angemeldet.`,
        code: "email_mismatch",
      };
    }
    if (code === "email_missing") {
      return {
        ok: false,
        error: "Ihr Konto hat keine E-Mail-Adresse. Bitte melden Sie sich mit der eingeladenen Adresse an.",
        code: "email_mismatch",
      };
    }
    if (code === "not_found") {
      return { ok: false, error: "Einladung nicht gefunden.", code: "not_found" };
    }
    return { ok: false, error: "Einladung konnte nicht angenommen werden." };
  }

  return { ok: true };
}

export async function acceptInvitation(options: {
  invitation: InvitationByToken;
  userId: string;
  userEmail: string | null;
  token: string;
}): Promise<AcceptResult> {
  if (await isActiveTeamMember(options.userId, options.invitation.company_id)) {
    return { ok: true };
  }

  const viaAdmin = await acceptInvitationAdmin(options);
  if (viaAdmin) return viaAdmin;

  return acceptInvitationRpc(normalizeInviteToken(options.token));
}
