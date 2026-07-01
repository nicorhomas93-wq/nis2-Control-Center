import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyPermission } from "@/lib/team/access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { ONBOARDING_STEPS, computeOnboardingPercent } from "@/lib/onboarding/steps";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId fehlt" }, { status: 400 });

  const access = await requireCompanyPermission(user.id, companyId, "company.read");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("*")
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });

  const rows = data ?? [];
  const { percent, incomplete } = computeOnboardingPercent(rows);
  const steps = ONBOARDING_STEPS.map((s) => {
    const row = rows.find((r) => r.step_key === s.key);
    return { ...s, status: row?.status ?? "pending", completedAt: row?.completed_at ?? null };
  });

  return NextResponse.json({ steps, percent, incomplete });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, stepKey, status, data: stepData } = body;
  if (!companyId || !stepKey) {
    return NextResponse.json({ error: "companyId und stepKey erforderlich" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "company.write");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const now = new Date().toISOString();
  const completed = status === "completed";

  const { data, error } = await supabase
    .from("onboarding_progress")
    .upsert(
      {
        company_id: companyId,
        step_key: stepKey,
        status: status ?? "in_progress",
        completed_by: completed ? user.id : null,
        completed_at: completed ? now : null,
        data_json: stepData ?? {},
        updated_at: now,
      },
      { onConflict: "company_id,step_key" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  return NextResponse.json({ progress: data });
}
