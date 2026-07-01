import { NextResponse } from "next/server";
import { runAllTaskReminders } from "@/lib/tasks/reminders-run";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (secret && auth === `Bearer ${secret}`) return true;
  if (process.env.VERCEL === "1" && vercelCron === "1" && secret) {
    return auth === `Bearer ${secret}`;
  }
  return false;
}

async function handleRun() {
  const result = await runAllTaskReminders();
  return NextResponse.json(result);
}

/** Täglicher Cron: Aufgaben-Erinnerungen (7/3/0 Tage, überfällig, kritisch täglich). */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleRun();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleRun();
}
