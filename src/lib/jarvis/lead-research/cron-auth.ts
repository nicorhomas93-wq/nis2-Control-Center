export function isLeadResearchCronAuthorized(request: Request): boolean {
  const secret =
    process.env.LEAD_RESEARCH_CRON_SECRET?.trim() ?? process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (secret && auth === `Bearer ${secret}`) return true;
  if (process.env.VERCEL === "1" && vercelCron === "1" && secret) {
    return auth === `Bearer ${secret}`;
  }
  return false;
}
