import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activeTriggers,
  buildTriggerMessage,
  TRIGGER_COOLDOWN_DAYS,
  type AutomationTriggerType,
} from "@/lib/jarvis/customer-message/automation-triggers";
import { evaluateCustomerProfile } from "@/lib/jarvis/customer-message/evaluate-customer-profile";
import { sendCustomerMessage } from "@/lib/jarvis/customer-message/send-customer-message";
import type { CustomerEntityType } from "@/lib/jarvis/customer-message/types";

export interface AutomationRunResult {
  entityType: CustomerEntityType;
  entityId: string;
  triggered: AutomationTriggerType[];
  skipped: AutomationTriggerType[];
  errors: string[];
}

async function isAutoEnabled(
  supabase: SupabaseClient,
  entityType: CustomerEntityType,
  entityId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("customer_message_automation")
    .select("auto_enabled")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  return Boolean(data?.auto_enabled);
}

async function wasTriggerSentRecently(
  supabase: SupabaseClient,
  entityType: CustomerEntityType,
  entityId: string,
  trigger: AutomationTriggerType
): Promise<boolean> {
  const cooldownDays = TRIGGER_COOLDOWN_DAYS[trigger];
  const since = new Date();
  since.setDate(since.getDate() - cooldownDays);

  const { count } = await supabase
    .from("customer_messages")
    .select("*", { count: "exact", head: true })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("source", "automatic")
    .eq("trigger_type", trigger)
    .gte("created_at", since.toISOString());

  return (count ?? 0) > 0;
}

export async function runAutomationForCustomer(
  supabase: SupabaseClient,
  input: {
    entityType: CustomerEntityType;
    entityId: string;
    sentByUserId?: string | null;
    sentByEmail?: string | null;
    force?: boolean;
  }
): Promise<AutomationRunResult> {
  const result: AutomationRunResult = {
    entityType: input.entityType,
    entityId: input.entityId,
    triggered: [],
    skipped: [],
    errors: [],
  };

  if (!input.force && !(await isAutoEnabled(supabase, input.entityType, input.entityId))) {
    return result;
  }

  const profile = await evaluateCustomerProfile(supabase, input.entityType, input.entityId);
  if (!profile) {
    result.errors.push("Profil nicht gefunden");
    return result;
  }

  const triggers = activeTriggers(profile);

  for (const trigger of triggers) {
    if (!input.force && (await wasTriggerSentRecently(supabase, input.entityType, input.entityId, trigger))) {
      result.skipped.push(trigger);
      continue;
    }

    const recipient = await resolveCompanyName(supabase, input.entityType, input.entityId);
    const message = buildTriggerMessage(trigger, recipient ?? "Kunde", profile);

    try {
      await sendCustomerMessage(supabase, {
        entityType: input.entityType,
        entityId: input.entityId,
        channel: "internal",
        subject: message.subject,
        body: message.body,
        sentByUserId: input.sentByUserId ?? null,
        sentByEmail: input.sentByEmail,
        source: "automatic",
        triggerType: trigger,
      });
      result.triggered.push(trigger);
    } catch (err) {
      result.errors.push(
        `${trigger}: ${err instanceof Error ? err.message : "Fehler"}`
      );
    }
  }

  return result;
}

async function resolveCompanyName(
  supabase: SupabaseClient,
  entityType: CustomerEntityType,
  entityId: string
): Promise<string | null> {
  if (entityType === "jarvis_lead") {
    const { data } = await supabase.from("leads").select("company_name").eq("id", entityId).maybeSingle();
    return data?.company_name ?? null;
  }
  const { data } = await supabase
    .from("b2b_outreach_leads")
    .select("company_name")
    .eq("id", entityId)
    .maybeSingle();
  return data?.company_name ?? null;
}

export async function runAutomationForAllEnabled(
  supabase: SupabaseClient
): Promise<AutomationRunResult[]> {
  const { data: settings } = await supabase
    .from("customer_message_automation")
    .select("entity_type, entity_id")
    .eq("auto_enabled", true);

  const results: AutomationRunResult[] = [];
  for (const row of settings ?? []) {
    const entityType = row.entity_type as CustomerEntityType;
    if (entityType !== "jarvis_lead" && entityType !== "b2b_outreach_lead") continue;
    results.push(
      await runAutomationForCustomer(supabase, {
        entityType,
        entityId: row.entity_id,
      })
    );
  }
  return results;
}
