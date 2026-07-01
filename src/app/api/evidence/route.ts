import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyPermission } from "@/lib/team/access";
import { getDbErrorMessage } from "@/lib/supabase/db-error";
import { logActivity } from "@/lib/activity/log";
import { completeTask } from "@/lib/tasks/service";
import { syncAndReturnComplianceSnapshot } from "@/lib/compliance/sync";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const {
    companyId,
    taskId,
    title,
    evidenceType,
    description,
    fileUrl,
    externalLink,
    relatedType,
    relatedId,
    auditArea,
  } = body;

  if (!companyId || !title) {
    return NextResponse.json({ error: "companyId und title erforderlich" }, { status: 400 });
  }

  const access = await requireCompanyPermission(user.id, companyId, "evidence.write");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: evidence, error } = await supabase
    .from("evidence_items")
    .insert({
      company_id: companyId,
      title,
      evidence_type: evidenceType ?? "file",
      description: description ?? null,
      file_url: fileUrl ?? null,
      external_link: externalLink ?? null,
      uploaded_by: user.id,
      related_type: relatedType ?? null,
      related_id: relatedId ?? null,
      task_id: taskId ?? null,
      audit_area: auditArea ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: getDbErrorMessage(error) }, { status: 500 });
  }

  await logActivity(supabase, {
    companyId,
    userId: user.id,
    action: "evidence_added",
    entityType: "evidence",
    entityId: evidence.id,
    comment: title,
  });

  if (taskId) {
    const { data: task } = await supabase
      .from("task_items")
      .select("status, evidence_required")
      .eq("id", taskId)
      .single();

    if (task?.status === "waiting_evidence" && task.evidence_required) {
      await completeTask(supabase, taskId, user.id, "Nachweis hochgeladen");
    } else if (task?.evidence_required) {
      await supabase
        .from("task_items")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", taskId);
    }
  }

  const snapshot = await syncAndReturnComplianceSnapshot(supabase, companyId);
  return NextResponse.json({ evidence, snapshot });
}
