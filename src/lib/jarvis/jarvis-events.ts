import type { SupabaseClient } from "@supabase/supabase-js";
import type { JarvisEvent } from "@/lib/types";

export async function logJarvisEvent(
  supabase: SupabaseClient,
  event: {
    event_type: string;
    entity_type?: string | null;
    entity_id?: string | null;
    summary: string;
    details?: Record<string, unknown>;
  }
): Promise<JarvisEvent | null> {
  const { data, error } = await supabase
    .from("jarvis_events")
    .insert({
      event_type: event.event_type,
      entity_type: event.entity_type ?? null,
      entity_id: event.entity_id ?? null,
      summary: event.summary,
      details: event.details ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("[Jarvis] Event-Log fehlgeschlagen:", error.message);
    return null;
  }

  return data as JarvisEvent;
}
