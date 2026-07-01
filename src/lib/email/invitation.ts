import { sendTransactionalEmail } from "@/lib/email/send";
import type { ResolvedBranding } from "@/lib/white-label/types";

export interface SendInvitationEmailInput {
  recipientEmail: string;
  inviteLink: string;
  roleLabel: string;
  branding: ResolvedBranding;
  companyName?: string | null;
  inviterEmail?: string | null;
}

export async function sendInvitationEmail(
  input: SendInvitationEmailInput
): Promise<{ sent: boolean; error?: string; method?: string }> {
  const productName = input.branding.displayName;
  const subject = `Einladung: ${productName}`;

  const body = [
    `Sie wurden eingeladen, dem Team${input.companyName ? ` von ${input.companyName}` : ""} beizutreten.`,
    "",
    `Rolle: ${input.roleLabel}`,
    "",
    "Einladung annehmen:",
    input.inviteLink,
    "",
    "Der Link ist 14 Tage gültig.",
    "",
    input.branding.supportEmail
      ? `Bei Fragen: ${input.branding.supportEmail}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; color: #1e293b;">
      <h2 style="color: ${input.branding.primaryColor};">Einladung zu ${productName}</h2>
      <p>Sie wurden eingeladen, dem Team${input.companyName ? ` von <strong>${input.companyName}</strong>` : ""} beizutreten.</p>
      <p><strong>Rolle:</strong> ${input.roleLabel}</p>
      <p style="margin: 24px 0;">
        <a href="${input.inviteLink}" style="background: ${input.branding.primaryColor}; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Einladung annehmen
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b;">Oder kopieren Sie diesen Link:<br><a href="${input.inviteLink}">${input.inviteLink}</a></p>
      <p style="font-size: 12px; color: #94a3b8;">Der Link ist 14 Tage gültig.</p>
    </div>
  `;

  const fromName = input.branding.emailSenderName?.trim() || productName;
  const from =
    process.env.PILOT_EMAIL_FROM?.trim() ||
    `${fromName} <onboarding@resend.dev>`;

  return sendTransactionalEmail({
    to: input.recipientEmail,
    subject,
    body,
    html,
    from,
    replyTo: input.inviterEmail ?? input.branding.supportEmail ?? undefined,
  });
}
