import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase-Client mit Service-Role (umgeht RLS).
 * Nur für vertrauenswürdige Server-Operationen wie öffentliche Formulare.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey?.trim()) {
    return null;
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
