import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyPermission } from "@/lib/team/access";
import { ensureOwnerMembership } from "@/lib/team/ensure-owner-member";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { INVITABLE_ROLES, ROLE_LABELS } from "@/lib/team/types";
import { queueEmailNotification, EMAIL_TEMPLATES } from "@/lib/email/queue";
import { sendInvitationEmail } from "@/lib/email/invitation";
import { getConsultantSettings, settingsToBranding } from "@/lib/white-label/branding";

function buildInviteLink(token: string, origin: string): string {
  return `${origin}/invite/${token}`;
}

async function dispatchInvitationEmail(options: {
  companyId: string;
  companyName: string | null;
  email: string;
  role: string;
  inviteLink: string;
  invitationId: string;
  inviterEmail: string | null;
}) {
  const { settings } = await getConsultantSettings(options.companyId);
  const branding = settingsToBranding(settings);
  const roleLabel = ROLE_LABELS[options.role as keyof typeof ROLE_LABELS] ?? options.role;
  const tpl = EMAIL_TEMPLATES.invitation;
  const ctx = {
    productName: branding.displayName,
    inviteLink: options.inviteLink,
    role: roleLabel,
  };
  const subject = tpl.subject(ctx);
  const body = tpl.body(ctx);

  const emailResult = await sendInvitationEmail({
    recipientEmail: options.email,
    inviteLink: options.inviteLink,
    roleLabel,
    branding,
    companyName: options.companyName,
    inviterEmail: options.inviterEmail,
  });

  const queueResult = await queueEmailNotification({
    companyId: options.companyId,
    recipientEmail: options.email,
    notificationType: "invitation",
    subject,
    body,
    relatedType: "invitation",
    relatedId: options.invitationId,
    initialStatus: emailResult.sent ? "sent" : "failed",
    sentAt: emailResult.sent ? new Date().toISOString() : undefined,
    errorMessage: emailResult.error,
  });

  return {
    emailSent: emailResult.sent,
    emailError: emailResult.error,
    emailMethod: emailResult.method,
    queueError: queueResult.error,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId fehlt" }, { status: 400 });

  const access = await requireCompanyPermission(user.id, companyId, "users.invite");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await supabase
    .from("company_invitations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: getDbErrorMessage(error), missingTable: isMissingTableError(error) },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const invitations = (data ?? []).map((inv) => ({
    ...inv,
    roleLabel: ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS] ?? inv.role,
    inviteLink: inv.status === "invited" ? buildInviteLink(inv.token, origin) : null,
  }));

  return NextResponse.json({ invitations });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, email, role } = body;
  if (!companyId || !email || !role) {
    return NextResponse.json({ error: "companyId, email und role erforderlich" }, { status: 400 });
  }

  if (!INVITABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Ungültige Rolle" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "users.invite");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (access.role === "owner") {
    await ensureOwnerMembership(companyId, user.id);
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);
  const normalizedEmail = email.toLowerCase().trim();

  const { data: invitation, error } = await supabase
    .from("company_invitations")
    .insert({
      company_id: companyId,
      email: normalizedEmail,
      role,
      token,
      status: "invited",
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const inviteLink = buildInviteLink(token, origin);
  const companyName = access.company.company_name ?? null;

  const emailDispatch = await dispatchInvitationEmail({
    companyId,
    companyName,
    email: normalizedEmail,
    role,
    inviteLink,
    invitationId: invitation.id,
    inviterEmail: user.email ?? null,
  });

  return NextResponse.json({
    invitation: { ...invitation, inviteLink },
    emailSent: emailDispatch.emailSent,
    emailError: emailDispatch.emailError ?? null,
    emailMethod: emailDispatch.emailMethod ?? null,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, invitationId, action } = body;
  if (!companyId || !invitationId || !action) {
    return NextResponse.json({ error: "Parameter fehlen" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "users.invite");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (action === "revoke") {
    const { error } = await supabase
      .from("company_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", invitationId)
      .eq("company_id", companyId);
    if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "resend") {
    const { data: inv } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("company_id", companyId)
      .single();

    if (!inv) return NextResponse.json({ error: "Einladung nicht gefunden" }, { status: 404 });

    const newToken = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { data: updated, error } = await supabase
      .from("company_invitations")
      .update({
        token: newToken,
        status: "invited",
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });

    const origin = new URL(request.url).origin;
    const inviteLink = buildInviteLink(newToken, origin);
    const emailDispatch = await dispatchInvitationEmail({
      companyId,
      companyName: access.company.company_name ?? null,
      email: inv.email,
      role: inv.role,
      inviteLink,
      invitationId: inv.id,
      inviterEmail: user.email ?? null,
    });

    return NextResponse.json({
      invitation: { ...updated, inviteLink },
      emailSent: emailDispatch.emailSent,
      emailError: emailDispatch.emailError ?? null,
      emailMethod: emailDispatch.emailMethod ?? null,
    });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
