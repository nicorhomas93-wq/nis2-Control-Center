import { createAdminClient } from "@/lib/supabase/admin";
import { getInvitationByToken, normalizeInviteToken } from "@/lib/team/invitation-token";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findUserByEmail(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string
) {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function registerInviteUser(options: {
  token: string;
  email: string;
  password: string;
}): Promise<
  | { ok: true; created: boolean }
  | { ok: false; error: string; suggestLogin?: boolean }
> {
  const token = normalizeInviteToken(options.token);
  const email = normalizeEmail(options.email);
  const password = options.password;

  if (!token) {
    return { ok: false, error: "Einladung ungültig." };
  }

  if (!email || !password || password.length < 6) {
    return { ok: false, error: "E-Mail und Passwort (mindestens 6 Zeichen) erforderlich." };
  }

  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    return { ok: false, error: "Einladung ungültig oder abgelaufen." };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { ok: false, error: "Diese Einladung ist abgelaufen." };
  }

  if (normalizeEmail(invitation.email) !== email) {
    return {
      ok: false,
      error: `Bitte registrieren Sie sich mit ${invitation.email}.`,
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Server-Konfiguration unvollständig (SUPABASE_SERVICE_ROLE_KEY fehlt).",
    };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!createError && created.user) {
    await admin.from("profiles").upsert(
      { id: created.user.id, email },
      { onConflict: "id" }
    );
    return { ok: true, created: true };
  }

  const createMessage = createError?.message?.toLowerCase() ?? "";
  const alreadyExists =
    createMessage.includes("already") ||
    createMessage.includes("registered") ||
    createMessage.includes("exists");

  if (!alreadyExists) {
    return {
      ok: false,
      error: createError?.message ?? "Konto konnte nicht erstellt werden.",
    };
  }

  const existing = await findUserByEmail(admin, email);
  if (!existing) {
    return {
      ok: false,
      error: "Konto existiert bereits, konnte aber nicht aktualisiert werden. Bitte anmelden.",
      suggestLogin: true,
    };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });

  if (updateError) {
    return {
      ok: false,
      error: "Konto existiert bereits. Bitte melden Sie sich mit Ihrem Passwort an.",
      suggestLogin: true,
    };
  }

  await admin.from("profiles").upsert({ id: existing.id, email }, { onConflict: "id" });

  return { ok: true, created: false };
}
