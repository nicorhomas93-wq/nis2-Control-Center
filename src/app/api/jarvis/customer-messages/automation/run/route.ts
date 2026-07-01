import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireJarvisApiAccess } from "@/lib/jarvis/require-api-access";
import { runAutomationForAllEnabled } from "@/lib/jarvis/customer-message/run-automation";

/**
 * Täglicher Cron: automatische Nachrichten für alle Kunden mit aktivierter Automatik.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const access = await requireJarvisApiAccess();
    if (!access.ok) return access.response;
  }

  const supabase = await createClient();
  const results = await runAutomationForAllEnabled(supabase);

  const summary = {
    customers: results.length,
    triggered: results.reduce((n, r) => n + r.triggered.length, 0),
    skipped: results.reduce((n, r) => n + r.skipped.length, 0),
    errors: results.flatMap((r) => r.errors),
  };

  return NextResponse.json({ summary, results });
}
