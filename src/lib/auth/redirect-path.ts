export function resolveAuthRedirect(
  redirectParam: string | undefined,
  fallback = "/dashboard"
): string {
  if (redirectParam?.startsWith("/") && !redirectParam.startsWith("//")) {
    return redirectParam;
  }
  return fallback;
}
