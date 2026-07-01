export const PENDING_INVITE_COOKIE = "pending_invite_redirect";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export function isInvitePath(path: string | null | undefined): path is string {
  return Boolean(path?.startsWith("/invite/") && path.length > "/invite/".length);
}

export function resolveInviteRedirect(
  redirectParam?: string | null,
  cookieValue?: string | null
): string | undefined {
  if (isInvitePath(redirectParam)) {
    return redirectParam;
  }
  if (isInvitePath(cookieValue)) {
    return cookieValue;
  }
  return redirectParam ?? undefined;
}

export function pendingInviteCookieOptions() {
  return {
    maxAge: MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
