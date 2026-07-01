import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyPermission } from "@/lib/team/access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import {
  QUESTIONNAIRES,
  evaluateBackupAnswers,
  evaluateQuestionnaireTasks,
  getQuestionnaire,
  type QuestionnaireArea,
} from "@/lib/compliance/questionnaires";
import { createTaskIfNotExists } from "@/lib/tasks/service";
import { logActivity } from "@/lib/activity/log";
import { syncAndReturnComplianceSnapshot } from "@/lib/compliance/sync";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const areaKey = searchParams.get("areaKey") as QuestionnaireArea | null;

  if (!companyId) return NextResponse.json({ error: "companyId fehlt" }, { status: 400 });

  const access = await requireCompanyPermission(user.id, companyId, "company.read");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await supabase
    .from("compliance_questionnaire_responses")
    .select("*")
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });

  const responses = data ?? [];
  const questionnaires = areaKey
    ? QUESTIONNAIRES.filter((q) => q.areaKey === areaKey)
    : QUESTIONNAIRES;

  return NextResponse.json({
    questionnaires,
    responses: responses.map((r) => ({
      areaKey: r.area_key,
      answers: r.answers_json,
      updatedAt: r.updated_at,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { companyId, areaKey, answers } = body as {
    companyId: string;
    areaKey: QuestionnaireArea;
    answers: Record<string, string>;
  };

  if (!companyId || !areaKey || !answers) {
    return NextResponse.json({ error: "companyId, areaKey und answers erforderlich" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "company.write");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const definition = getQuestionnaire(areaKey);
  if (!definition) {
    return NextResponse.json({ error: "Unbekannter Fragebogen" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("compliance_questionnaire_responses")
    .upsert(
      {
        company_id: companyId,
        area_key: areaKey,
        answers_json: answers,
        completed_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,area_key" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });

  await logActivity(supabase, {
    companyId,
    userId: user.id,
    action: "questionnaire_saved",
    entityType: "questionnaire",
    entityId: data.id,
    comment: `Fragebogen „${definition.title}" gespeichert`,
    newValue: answers,
  });

  const taskSpecs = evaluateQuestionnaireTasks(areaKey, answers);
  for (const spec of taskSpecs) {
    await createTaskIfNotExists(supabase, {
      companyId,
      title: spec.taskTitle,
      description: spec.description,
      taskType: spec.taskType ?? "general",
      priority: spec.priority ?? "medium",
      evidenceRequired: spec.evidenceRequired ?? true,
      createdBy: user.id,
      relatedType: `questionnaire_${areaKey}`,
      relatedId: data.id,
    });
  }

  const backupEval = areaKey === "backup" ? evaluateBackupAnswers(answers) : null;
  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);

  return NextResponse.json({
    response: data,
    tasksCreated: taskSpecs.length,
    backupEvaluation: backupEval,
    snapshot,
  });
}
