import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateLeadScore } from "@/lib/jarvis/lead-scoring";
import { logJarvisEvent } from "@/lib/jarvis/jarvis-events";
import type { Lead, PilotRequest, EmailTemplate } from "@/lib/types";

export type SyncPilotRequestsResult = {
  synced: number;
  skipped: number;
  errors: string[];
  leads: Lead[];
};

async function loadPilotRequests(
  supabase: SupabaseClient
): Promise<{ requests: PilotRequest[]; error?: string }> {
  const { data, error } = await supabase
    .from("pilot_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error) return { requests: (data ?? []) as PilotRequest[] };

  const admin = createAdminClient();
  if (!admin) {
    return { requests: [], error: error.message };
  }

  const adminRes = await admin
    .from("pilot_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (adminRes.error) {
    return { requests: [], error: adminRes.error.message };
  }

  return { requests: (adminRes.data ?? []) as PilotRequest[] };
}

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) =>
      text.replaceAll(`{{${key}}}`, value),
    template
  );
}

async function createFirstContactDraft(
  supabase: SupabaseClient,
  lead: Lead,
  request: PilotRequest
): Promise<void> {
  const { data: template } = await supabase
    .from("email_templates")
    .select("*")
    .eq("purpose", "first_contact")
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!template) return;

  const vars = {
    contact_name: request.name,
    company_name: request.company,
    email: request.email,
  };

  const tpl = template as EmailTemplate;
  await supabase.from("lead_interactions").insert({
    lead_id: lead.id,
    type: "email",
    direction: "outbound",
    subject: applyTemplate(tpl.subject, vars),
    content: applyTemplate(tpl.body, vars),
    status: "draft",
  });
}

export async function syncPilotRequestsToLeads(
  supabase: SupabaseClient
): Promise<SyncPilotRequestsResult> {
  const result: SyncPilotRequestsResult = {
    synced: 0,
    skipped: 0,
    errors: [],
    leads: [],
  };

  const { requests, error: loadError } = await loadPilotRequests(supabase);
  if (loadError) {
    result.errors.push(loadError);
    return result;
  }

  const { data: existingLeads } = await supabase
    .from("leads")
    .select("email")
    .not("email", "is", null);

  const existingEmails = new Set(
    (existingLeads ?? [])
      .map((lead) => lead.email?.trim().toLowerCase())
      .filter(Boolean)
  );

  for (const request of requests) {
    const email = request.email.trim().toLowerCase();
    if (!email) {
      result.skipped += 1;
      continue;
    }

    if (existingEmails.has(email)) {
      result.skipped += 1;
      continue;
    }

    const leadInput = {
      company_name: request.company,
      contact_name: request.name,
      email: request.email.trim(),
      phone: request.phone,
      industry: request.industry,
      source: "pilot_request",
      status: "new" as const,
      notes: request.message,
      consent_status: "opt_in" as const,
    };

    const scoring = calculateLeadScore(leadInput);

    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        ...leadInput,
        lead_score: scoring.score,
      })
      .select()
      .single();

    if (insertError) {
      result.errors.push(`${request.email}: ${insertError.message}`);
      continue;
    }

    existingEmails.add(email);
    result.synced += 1;
    result.leads.push(lead as Lead);

    await logJarvisEvent(supabase, {
      event_type: "pilot_synced",
      entity_type: "lead",
      entity_id: lead.id,
      summary: `Lead aus Pilotanfrage erstellt: ${request.company}`,
      details: {
        pilot_request_id: request.id,
        email: request.email,
        lead_score: scoring.score,
        category: scoring.category,
      },
    });

    await supabase.from("sales_tasks").insert({
      lead_id: lead.id,
      title: "Erstkontakt vorbereiten",
      description:
        "E-Mail-Entwurf prüfen und manuell freigeben. Kein automatischer Versand ohne Freigabe.",
      priority: scoring.category === "hot" ? "high" : "medium",
      status: "open",
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    await createFirstContactDraft(supabase, lead as Lead, request);
  }

  if (result.synced > 0) {
    await logJarvisEvent(supabase, {
      event_type: "pilot_sync_batch",
      entity_type: "system",
      summary: `${result.synced} Pilotanfrage(n) als Leads übernommen`,
      details: {
        synced: result.synced,
        skipped: result.skipped,
      },
    });
  }

  return result;
}
