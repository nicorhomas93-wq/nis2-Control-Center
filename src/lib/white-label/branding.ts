import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompany, getOrCreateProfile } from "@/lib/company";
import { canUseFeature } from "@/lib/billingAccess";
import { isPlatformOwner } from "@/lib/jarvis/access";
import { getDbErrorMessage, isMissingTableError } from "@/lib/supabase/db-error";
import { normalizeHexColor } from "@/lib/white-label/colors";
import {
  DEFAULT_BRANDING,
  DEFAULT_CONSULTANT_SETTINGS,
  type ConsultantSettings,
  type ResolvedBranding,
} from "@/lib/white-label/types";

export function settingsToBranding(settings: ConsultantSettings | null): ResolvedBranding {
  if (!settings?.white_label_enabled) {
    return { ...DEFAULT_BRANDING };
  }

  return {
    active: true,
    displayName: settings.display_name?.trim() || DEFAULT_BRANDING.displayName,
    tagline: "NIS2 Control Center",
    logoUrl: settings.logo_url,
    primaryColor: normalizeHexColor(settings.primary_color, DEFAULT_BRANDING.primaryColor),
    secondaryColor: normalizeHexColor(settings.secondary_color, DEFAULT_BRANDING.secondaryColor),
    accentColor: normalizeHexColor(settings.accent_color, DEFAULT_BRANDING.accentColor),
    emailSenderName: settings.email_sender_name,
    supportEmail: settings.support_email,
    customDomain: settings.custom_domain,
  };
}

export async function getConsultantSettings(
  companyId: string
): Promise<{ settings: ConsultantSettings | null; missingTable: boolean; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consultant_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    return {
      settings: null,
      missingTable: isMissingTableError(error),
      error: getDbErrorMessage(error),
    };
  }

  return { settings: (data as ConsultantSettings | null) ?? null, missingTable: false, error: null };
}

export async function canManageWhiteLabel(userId: string, email?: string | null): Promise<{
  allowed: boolean;
  companyId: string | null;
  platformOwner: boolean;
}> {
  const { company } = await getOrCreateCompany(userId);
  const profile = await getOrCreateProfile(userId, email ?? undefined);
  const platformOwner = isPlatformOwner(email, profile?.role);
  const allowed = canUseFeature(company, "white_label", platformOwner);

  return {
    allowed,
    companyId: company?.id ?? null,
    platformOwner,
  };
}

export async function resolveBrandingForUser(
  userId: string,
  email?: string | null
): Promise<ResolvedBranding> {
  const access = await canManageWhiteLabel(userId, email);
  if (!access.allowed || !access.companyId) {
    return { ...DEFAULT_BRANDING };
  }

  const { settings } = await getConsultantSettings(access.companyId);
  return settingsToBranding(settings);
}

export function mergeConsultantSettings(
  companyId: string,
  existing: ConsultantSettings | null,
  patch: Partial<ConsultantSettings>
): ConsultantSettings {
  return {
    company_id: companyId,
    white_label_enabled: patch.white_label_enabled ?? existing?.white_label_enabled ?? false,
    display_name: patch.display_name ?? existing?.display_name ?? null,
    logo_url: patch.logo_url ?? existing?.logo_url ?? null,
    primary_color: patch.primary_color ?? existing?.primary_color ?? DEFAULT_CONSULTANT_SETTINGS.primary_color,
    secondary_color:
      patch.secondary_color ?? existing?.secondary_color ?? DEFAULT_CONSULTANT_SETTINGS.secondary_color,
    accent_color: patch.accent_color ?? existing?.accent_color ?? DEFAULT_CONSULTANT_SETTINGS.accent_color,
    email_sender_name: patch.email_sender_name ?? existing?.email_sender_name ?? null,
    support_email: patch.support_email ?? existing?.support_email ?? null,
    custom_domain: patch.custom_domain ?? existing?.custom_domain ?? null,
    created_at: existing?.created_at,
    updated_at: existing?.updated_at,
  };
}
